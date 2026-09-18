import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/http/responses';
import { userPublicSelect } from '@/lib/permissions';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, context) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid department id');

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return fail('Department not found', 404);

  const employees = await prisma.user.findMany({
    where: { departmentId: id, deletedAt: null },
    select: userPublicSelect,
    orderBy: { name: 'asc' },
  });

  return ok({ employees });
}, ['ADMIN', 'HR_MANAGER']);
