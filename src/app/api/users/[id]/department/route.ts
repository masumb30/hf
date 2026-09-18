import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { userPublicSelect } from '@/lib/permissions';
import { assignDepartmentSchema } from '@/lib/validation/user.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid user id');

  const parsed = parseJson(assignDepartmentSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return fail('User not found', 404);

  const dept = await prisma.department.findUnique({
    where: { id: parsed.data.departmentId },
  });
  if (!dept) return fail('Department not found', 404);

  const user = await withTx(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { departmentId: parsed.data.departmentId },
      select: userPublicSelect,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'USER_DEPARTMENT_ASSIGNED',
      entityType: 'User',
      entityId: id,
      metadata: { departmentId: parsed.data.departmentId },
    });
    return updated;
  });

  return ok(user, 'Employee assigned to department');
}, ['ADMIN', 'HR_MANAGER']);

export const DELETE = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid user id');

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return fail('User not found', 404);

  const user = await withTx(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { departmentId: null },
      select: userPublicSelect,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'USER_DEPARTMENT_REMOVED',
      entityType: 'User',
      entityId: id,
    });
    return updated;
  });

  return ok(user, 'Employee removed from department');
}, ['ADMIN', 'HR_MANAGER']);
