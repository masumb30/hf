import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { assignHeadSchema } from '@/lib/validation/department.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid department id');

  const parsed = parseJson(assignHeadSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return fail('Department not found', 404);

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user || user.deletedAt) return fail('User not found', 404);
  if (user.status !== 'ACTIVE' || user.deactivatedAt) {
    return fail('Department head must be an active user');
  }

  const updated = await withTx(async (tx) => {
    const result = await tx.department.update({
      where: { id },
      data: { headId: user.id },
      include: { head: { select: { id: true, name: true, email: true } } },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'DEPARTMENT_HEAD_ASSIGNED',
      entityType: 'Department',
      entityId: id,
      metadata: { userId: user.id },
    });
    return result;
  });

  return ok(updated, 'Department head assigned');
}, ['ADMIN', 'HR_MANAGER']);

export const DELETE = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid department id');

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return fail('Department not found', 404);

  const updated = await withTx(async (tx) => {
    const result = await tx.department.update({
      where: { id },
      data: { headId: null },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'DEPARTMENT_HEAD_REMOVED',
      entityType: 'Department',
      entityId: id,
    });
    return result;
  });

  return ok(updated, 'Department head removed');
}, ['ADMIN', 'HR_MANAGER']);
