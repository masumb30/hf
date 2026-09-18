import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { conversationInclude } from '@/lib/conversations';
import { withTx } from '@/lib/db/transaction';
import { ok, created, fail } from '@/lib/http/responses';
import { isHrOrAdmin, requireConversationAccess } from '@/lib/permissions';
import { addParticipantSchema } from '@/lib/validation/conversation.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid conversation id');

  const { conversation, allowed } = await requireConversationAccess(actor, id);
  if (!conversation) return fail('Conversation not found', 404);
  if (!allowed) return fail('Forbidden', 403);

  const full = await prisma.conversation.findUnique({
    where: { id },
    include: conversationInclude,
  });
  return ok({ participants: full?.participants ?? [] });
});

export const POST = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid conversation id');

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return fail('Conversation not found', 404);
  if (conversation.type !== 'ORGANIZATIONAL') {
    return fail('Participants can only be added to organizational conversations');
  }

  const parsed = parseJson(addParticipantSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  if (parsed.data.userId) {
    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user || user.deletedAt) return fail('User not found', 404);
  }
  if (parsed.data.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: parsed.data.departmentId },
    });
    if (!dept) return fail('Department not found', 404);
  }

  const participant = await withTx(async (tx) => {
    const createdParticipant = await tx.conversationParticipant.create({
      data: {
        conversationId: id,
        userId: parsed.data.userId,
        departmentId: parsed.data.departmentId,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'CONVERSATION_PARTICIPANT_ADDED',
      entityType: 'Conversation',
      entityId: id,
      metadata: parsed.data,
    });
    return createdParticipant;
  });

  return created(participant, 'Participant added');
}, ['ADMIN', 'HR_MANAGER']);
