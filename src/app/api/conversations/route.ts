import { prisma } from '@/lib/prisma';
import { notifyUsers, writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, created, fail } from '@/lib/http/responses';
import { conversationInclude, listAccessibleConversations } from '@/lib/conversations';
import { directDedupeKey, isHrOrAdmin, isHeadOfDepartment } from '@/lib/permissions';
import { createConversationSchema } from '@/lib/validation/conversation.schema';
import { parseJson } from '@/lib/validation/common';
import { withAuth, readBody } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, _context, actor) => {
  const conversations = await listAccessibleConversations(actor);
  return ok({ conversations });
});

export const POST = withAuth(async (req, _context, actor) => {
  const parsed = parseJson(createConversationSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);
  const body = parsed.data;

  if (body.type === 'DIRECT') {
    if (body.recipientId === actor.id) {
      return fail('Cannot start a direct conversation with yourself');
    }
    const recipient = await prisma.user.findUnique({ where: { id: body.recipientId } });
    if (!recipient || recipient.deletedAt) return fail('Recipient not found', 404);

    const dedupeKey = directDedupeKey(actor.id, body.recipientId);
    const existing = await prisma.conversation.findUnique({
      where: { dedupeKey },
      include: conversationInclude,
    });
    if (existing) return ok(existing, 'Conversation already exists');

    const conversation = await withTx(async (tx) => {
      const createdConv = await tx.conversation.create({
        data: {
          type: 'DIRECT',
          dedupeKey,
          participants: {
            create: [
              { userId: actor.id },
              { userId: body.recipientId },
            ],
          },
        },
        include: conversationInclude,
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: 'CONVERSATION_CREATED',
        entityType: 'Conversation',
        entityId: createdConv.id,
        metadata: { type: 'DIRECT' },
      });
      return createdConv;
    });
    return created(conversation, 'Conversation created');
  }

  if (body.type === 'EMPLOYEE_TO_DEPT') {
    const department = await prisma.department.findUnique({
      where: { id: body.departmentId },
    });
    if (!department) return fail('Department not found', 404);

    const conversation = await withTx(async (tx) => {
      const createdConv = await tx.conversation.create({
        data: {
          type: 'ORGANIZATIONAL',
          title: body.title ?? `Message to ${department.name}`,
          participants: {
            create: [{ userId: actor.id }, { departmentId: department.id }],
          },
        },
        include: conversationInclude,
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: 'CONVERSATION_CREATED',
        entityType: 'Conversation',
        entityId: createdConv.id,
        metadata: { type: body.type },
      });
      return createdConv;
    });
    return created(conversation, 'Conversation created');
  }

  const senderDept = await prisma.department.findUnique({
    where: { id: body.senderDepartmentId },
  });
  if (!senderDept) return fail('Sender department not found', 404);

  const allowed =
    isHrOrAdmin(actor.role) || (await isHeadOfDepartment(actor.id, senderDept.id));
  if (!allowed) {
    return fail('Only admin, HR, or the sender department head can create this conversation', 403);
  }

  if (body.type === 'DEPT_TO_DEPT') {
    if (body.senderDepartmentId === body.recipientDepartmentId) {
      return fail('Sender and recipient departments must differ');
    }
    const recipientDept = await prisma.department.findUnique({
      where: { id: body.recipientDepartmentId },
    });
    if (!recipientDept) return fail('Recipient department not found', 404);

    const conversation = await withTx(async (tx) => {
      const createdConv = await tx.conversation.create({
        data: {
          type: 'ORGANIZATIONAL',
          title: body.title,
          participants: {
            create: [
              { departmentId: senderDept.id },
              { departmentId: recipientDept.id },
            ],
          },
        },
        include: conversationInclude,
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: 'CONVERSATION_CREATED',
        entityType: 'Conversation',
        entityId: createdConv.id,
        metadata: { type: body.type },
      });
      return createdConv;
    });
    return created(conversation);
  }

  const recipient = await prisma.user.findUnique({
    where: { id: body.recipientUserId },
  });
  if (!recipient || recipient.deletedAt) return fail('Recipient not found', 404);

  const conversation = await withTx(async (tx) => {
    const createdConv = await tx.conversation.create({
      data: {
        type: 'ORGANIZATIONAL',
        title: body.title,
        participants: {
          create: [
            { departmentId: senderDept.id },
            { userId: recipient.id },
          ],
        },
      },
      include: conversationInclude,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'CONVERSATION_CREATED',
      entityType: 'Conversation',
      entityId: createdConv.id,
      metadata: { type: body.type },
    });
    await notifyUsers(tx, [recipient.id], 'CONVERSATION_CREATED', {
      conversationId: createdConv.id,
    });
    return createdConv;
  });

  return created(conversation, 'Conversation created');
});
