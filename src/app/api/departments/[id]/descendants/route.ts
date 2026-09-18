import { ok, fail } from '@/lib/http/responses';
import { getDescendantDepartments } from '@/lib/permissions';
import { objectIdSchema } from '@/lib/validation/common';
import { prisma } from '@/lib/prisma';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, context) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid department id');

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return fail('Department not found', 404);

  const descendants = await getDescendantDepartments(id, department.path);
  return ok({ descendants });
}, ['ADMIN', 'HR_MANAGER']);
