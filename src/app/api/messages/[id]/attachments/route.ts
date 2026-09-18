import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, created, fail } from '@/lib/http/responses';
import { requireConversationAccess } from '@/lib/permissions';
import { uploadObject } from '@/lib/storage/object-storage';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

async function getMessageAccess(actor: Parameters<typeof requireConversationAccess>[0], id: string) {
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) return { message: null, allowed: false };
  const access = await requireConversationAccess(actor, message.conversationId);
  return { message, allowed: access.allowed };
}

export const GET = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid message id');

  const { message, allowed } = await getMessageAccess(actor, id);
  if (!message) return fail('Message not found', 404);
  if (!allowed) return fail('Forbidden', 403);

  const attachments = await prisma.attachment.findMany({
    where: { messageId: id },
  });
  return ok({ attachments });
});

export const POST = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid message id');

  const { message, allowed } = await getMessageAccess(actor, id);
  if (!message) return fail('Message not found', 404);
  if (!allowed) return fail('Forbidden', 403);
  if (message.senderId !== actor.id) {
    return fail('Only the message sender can upload attachments', 403);
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return fail('file is required');

  const { storageKey, fileSize } = await uploadObject(file, file.name);
  const attachment = await withTx(async (tx) => {
    const createdAttachment = await tx.attachment.create({
      data: {
        messageId: id,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize,
        storageKey,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'ATTACHMENT_UPLOADED',
      entityType: 'Attachment',
      entityId: createdAttachment.id,
      metadata: { messageId: id, fileName: file.name },
    });
    return createdAttachment;
  });

  return created(attachment, 'Attachment uploaded');
});
