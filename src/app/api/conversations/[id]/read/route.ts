import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/http/responses';
import { requireConversationAccess } from '@/lib/permissions';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid conversation id');

  const { conversation, allowed } = await requireConversationAccess(actor, id);
  if (!conversation) return fail('Conversation not found', 404);
  if (!allowed) return fail('Forbidden', 403);

  const existing = await prisma.conversationParticipant.findFirst({
    where: { conversationId: id, userId: actor.id },
  });
  if (!existing) {
    return fail('No participant record to mark as read', 403);
  }

  const participant = await prisma.conversationParticipant.update({
    where: { id: existing.id },
    data: { lastReadAt: new Date() },
  });

  return ok(participant, 'Conversation marked as read');
});
