import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { updateDepartmentSchema } from '@/lib/validation/department.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

const departmentInclude = {
  head: { select: { id: true, name: true, email: true } },
  parent: { select: { id: true, name: true } },
};

export const GET = withAuth(async (_req, context) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid department id');

  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      ...departmentInclude,
      _count: { select: { employees: true, children: true } },
    },
  });
  if (!department) return fail('Department not found', 404);
  return ok(department);
});

export const PATCH = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid department id');

  const parsed = parseJson(updateDepartmentSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) return fail('Department not found', 404);

  const department = await withTx(async (tx) => {
    const updated = await tx.department.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
      include: departmentInclude,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'Department',
      entityId: id,
      metadata: parsed.data,
    });
    return updated;
  });

  return ok(department, 'Department updated');
}, ['ADMIN', 'HR_MANAGER']);
