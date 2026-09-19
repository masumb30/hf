import { prisma } from '@/lib/prisma';
import { notifyUsers, writeAudit } from '@/lib/audit';
import { conversationRecipientUserIds } from '@/lib/conversations';
import { withTx } from '@/lib/db/transaction';
import { ok, created, fail } from '@/lib/http/responses';
import { requireConversationAccess } from '@/lib/permissions';
import { sendMessageSchema } from '@/lib/validation/message.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid conversation id');

  const { conversation, allowed } = await requireConversationAccess(actor, id as string);
  if (!conversation) return fail('Conversation not found', 404);
  if (!allowed) return fail('Forbidden', 403);

  const take = Number(new URL(req.url).searchParams.get('take') ?? 50);
  const skip = Number(new URL(req.url).searchParams.get('skip') ?? 0);

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      attachments: true,
    },
    orderBy: { createdAt: 'asc' },
    skip: Number.isNaN(skip) ? 0 : skip,
    take: Number.isNaN(take) ? 50 : Math.min(take, 100),
  });

  const sanitized = messages.map((m) =>
    m.deletedAt ? { ...m, content: null } : m
  );
  return ok({ messages: sanitized });
});

export const POST = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid conversation id');

  const { conversation, allowed } = await requireConversationAccess(actor, id as string);
  if (!conversation) return fail('Conversation not found', 404);
  if (!allowed) return fail('Forbidden', 403);

  const parsed = parseJson(sendMessageSchema, (await readBody(req)) ?? {});
  if (!parsed.success) return fail(parsed.message);
  if (!parsed.data.content) return fail('content is required');

  const message = await withTx(async (tx) => {
    const createdMessage = await tx.message.create({
      data: {
        conversationId: id as string,
        senderId: actor.id,
        content: parsed.data.content,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        attachments: true,
      },
    });
    await tx.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'MESSAGE_SENT',
      entityType: 'Message',
      entityId: createdMessage.id,
      metadata: { conversationId: id },
    });
    const recipients = await conversationRecipientUserIds(id as string, actor.id);
    await notifyUsers(tx, recipients, 'MESSAGE_RECEIVED', {
      conversationId: id,
      messageId: createdMessage.id,
    });
    return createdMessage;
  });

  return created(message, 'Message sent');
});
