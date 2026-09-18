import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, created, fail } from '@/lib/http/responses';
import { departmentPath } from '@/lib/permissions';
import { createDepartmentSchema } from '@/lib/validation/department.schema';
import { parseJson } from '@/lib/validation/common';
import { withAuth, readBody } from '@/utils/apiWrapper';

const departmentInclude = {
  head: { select: { id: true, name: true, email: true } },
  parent: { select: { id: true, name: true } },
};

export const GET = withAuth(async () => {
  const departments = await prisma.department.findMany({
    include: departmentInclude,
    orderBy: { name: 'asc' },
  });
  return ok({ departments });
});

export const POST = withAuth(async (req, _context, actor) => {
  const parsed = parseJson(createDepartmentSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const { name, description, parentId } = parsed.data;
  const existing = await prisma.department.findUnique({ where: { name } });
  if (existing) return fail('Department name already exists');

  let parent = null;
  if (parentId) {
    parent = await prisma.department.findUnique({ where: { id: parentId } });
    if (!parent) return fail('Parent department not found', 404);
  }

  const department = await withTx(async (tx) => {
    const createdDept = await tx.department.create({
      data: { name, description, parentId: parentId ?? null, path: 'pending' },
    });
    const path = departmentPath(parent?.path, createdDept.id);
    const updated = await tx.department.update({
      where: { id: createdDept.id },
      data: { path },
      include: departmentInclude,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'DEPARTMENT_CREATED',
      entityType: 'Department',
      entityId: updated.id,
      metadata: { name, parentId },
    });
    return updated;
  });

  return created(department, 'Department created');
}, ['ADMIN', 'HR_MANAGER']);
