import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { isHrOrAdmin, userPublicSelect } from '@/lib/permissions';
import { updateUserSchema } from '@/lib/validation/user.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  const parsed = objectIdSchema.safeParse(id);
  if (!parsed.success) return fail('Invalid user id');

  if (actor.id !== id && !isHrOrAdmin(actor.role)) {
    return fail('Forbidden', 403);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...userPublicSelect,
      department: { select: { id: true, name: true, path: true } },
    },
  });
  if (!user || (user.deletedAt && !isHrOrAdmin(actor.role))) {
    return fail('User not found', 404);
  }
  return ok(user);
});

export const PATCH = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  const parsedId = objectIdSchema.safeParse(id);
  if (!parsedId.success) return fail('Invalid user id');

  if (actor.id !== id && !isHrOrAdmin(actor.role)) {
    return fail('Forbidden', 403);
  }

  const parsed = parseJson(updateUserSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const body = { ...parsed.data };
  if (actor.id === id && !isHrOrAdmin(actor.role)) {
    delete body.role;
    delete body.status;
    delete body.departmentId;
  }

  if (actor.role === 'HR_MANAGER' && body.role && body.role !== 'EMPLOYEE') {
    return fail('HR managers cannot assign this role', 403);
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return fail('User not found', 404);

  if (body.password) {
    body.password = await bcrypt.hash(body.password, 10);
  }

  const user = await withTx(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        position: body.position,
        password: body.password,
        ...(isHrOrAdmin(actor.role)
          ? {
              role: body.role,
              status: body.status,
              departmentId: body.departmentId,
            }
          : {}),
      },
      select: userPublicSelect,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: body,
    });
    return updated;
  });

  return ok(user, 'User updated successfully');
});

export const DELETE = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  const parsedId = objectIdSchema.safeParse(id);
  if (!parsedId.success) return fail('Invalid user id');
  if (actor.id === id) return fail('You cannot delete your own account', 403);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return fail('User not found', 404);

  const user = await withTx(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
      select: userPublicSelect,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: id,
    });
    return updated;
  });

  return ok(user, 'User deleted successfully');
}, ['ADMIN']);
