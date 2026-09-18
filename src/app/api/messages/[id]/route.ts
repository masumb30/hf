import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { requireConversationAccess } from '@/lib/permissions';
import { editMessageSchema } from '@/lib/validation/message.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

async function loadAccessibleMessage(actor: Parameters<typeof requireConversationAccess>[0], id: string) {
  const message = await prisma.message.findUnique({
    where: { id },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      attachments: true,
    },
  });
  if (!message) return { message: null, allowed: false };
  const access = await requireConversationAccess(actor, message.conversationId);
  return { message, allowed: access.allowed };
}

export const GET = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid message id');

  const { message, allowed } = await loadAccessibleMessage(actor, id);
  if (!message) return fail('Message not found', 404);
  if (!allowed) return fail('Forbidden', 403);

  return ok(message.deletedAt ? { ...message, content: null } : message);
});

export const PATCH = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid message id');

  const { message, allowed } = await loadAccessibleMessage(actor, id);
  if (!message) return fail('Message not found', 404);
  if (!allowed) return fail('Forbidden', 403);
  if (message.senderId !== actor.id) return fail('You can only edit your own messages', 403);
  if (message.deletedAt) return fail('Cannot edit a deleted message');

  const parsed = parseJson(editMessageSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const updated = await withTx(async (tx) => {
    const result = await tx.message.update({
      where: { id },
      data: { content: parsed.data.content, editedAt: new Date() },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        attachments: true,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'MESSAGE_EDITED',
      entityType: 'Message',
      entityId: id,
    });
    return result;
  });

  return ok(updated, 'Message updated');
});

export const DELETE = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid message id');

  const { message, allowed } = await loadAccessibleMessage(actor, id);
  if (!message) return fail('Message not found', 404);
  if (!allowed) return fail('Forbidden', 403);
  if (message.senderId !== actor.id) return fail('You can only delete your own messages', 403);

  const updated = await withTx(async (tx) => {
    const result = await tx.message.update({
      where: { id },
      data: { deletedAt: new Date(), content: null },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'MESSAGE_DELETED',
      entityType: 'Message',
      entityId: id,
    });
    return result;
  });

  return ok(updated, 'Message deleted');
});
