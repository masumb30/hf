import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { departmentPath, getDescendantDepartments, wouldCreateCycle } from '@/lib/permissions';
import { moveDepartmentSchema } from '@/lib/validation/department.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid department id');

  const parsed = parseJson(moveDepartmentSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return fail('Department not found', 404);

  const parentId = parsed.data.parentId;
  let parent = null;
  if (parentId) {
    parent = await prisma.department.findUnique({ where: { id: parentId } });
    if (!parent) return fail('Parent department not found', 404);
  }

  const descendants = await getDescendantDepartments(id, department.path);
  if (wouldCreateCycle(id, parentId, descendants.map((d) => d.id))) {
    return fail('Move would create a cycle');
  }

  const oldPath = department.path ?? `/${id}`;
  const newPath = departmentPath(parent?.path, id);

  const updated = await withTx(async (tx) => {
    const moved = await tx.department.update({
      where: { id },
      data: { parentId, path: newPath },
    });

    for (const child of descendants) {
      const childPath = child.path ?? `/${child.id}`;
      const suffix = childPath.startsWith(`${oldPath}/`)
        ? childPath.slice(oldPath.length)
        : `/${child.id}`;
      await tx.department.update({
        where: { id: child.id },
        data: { path: `${newPath}${suffix}` },
      });
    }

    await writeAudit(tx, {
      actorId: actor.id,
      action: 'DEPARTMENT_MOVED',
      entityType: 'Department',
      entityId: id,
      metadata: { parentId, newPath },
    });
    return moved;
  });

  return ok(updated, 'Department moved');
}, ['ADMIN', 'HR_MANAGER']);
