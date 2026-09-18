import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/http/responses';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, context) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid department id');

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return fail('Department not found', 404);
  if (!department.path) return ok({ ancestors: [] });

  const ids = department.path.split('/').filter(Boolean).filter((part) => part !== id);
  const ancestors = ids.length
    ? await prisma.department.findMany({
        where: { id: { in: ids } },
        orderBy: { path: 'asc' },
      })
    : [];

  return ok({ ancestors });
}, ['ADMIN', 'HR_MANAGER']);
