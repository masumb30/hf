import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { requireConversationAccess } from '@/lib/permissions';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid conversation id');

  const { conversation, allowed } = await requireConversationAccess(actor, id as string);
  if (!conversation) return fail('Conversation not found', 404);
  if (!allowed) return fail('Forbidden', 403);

  const existing = await prisma.conversationParticipant.findFirst({
    where: { conversationId: id, userId: actor.id, isActive: true },
  });
  if (!existing) {
    return fail('You are not an active user participant of this conversation', 403);
  }

  const participant = await withTx(async (tx) => {
    const result = await tx.conversationParticipant.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'CONVERSATION_LEFT',
      entityType: 'Conversation',
      entityId: id,
    });
    return result;
  });

  return ok(participant, 'Left conversation');
});
