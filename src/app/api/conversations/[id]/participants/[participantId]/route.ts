import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const DELETE = withAuth(async (_req, context, actor) => {
  const conversationId = await paramId(context);
  const participantId = await paramId(context, 'participantId');
  if (!objectIdSchema.safeParse(conversationId).success) {
    return fail('Invalid conversation id');
  }
  if (!objectIdSchema.safeParse(participantId).success) {
    return fail('Invalid participant id');
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) return fail('Conversation not found', 404);
  if (conversation.type !== 'ORGANIZATIONAL') {
    return fail('Participants can only be removed from organizational conversations');
  }

  const participant = await prisma.conversationParticipant.findFirst({
    where: { id: participantId, conversationId },
  });
  if (!participant) return fail('Participant not found', 404);

  const updated = await withTx(async (tx) => {
    const result = await tx.conversationParticipant.update({
      where: { id: participantId },
      data: { isActive: false },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'CONVERSATION_PARTICIPANT_REMOVED',
      entityType: 'Conversation',
      entityId: conversationId,
      metadata: { participantId },
    });
    return result;
  });

  return ok(updated, 'Participant removed');
}, ['ADMIN', 'HR_MANAGER']);
