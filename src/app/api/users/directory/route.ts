import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { userPublicSelect } from '@/lib/permissions';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async () => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, deactivatedAt: null, status: 'ACTIVE' },
    select: {
      ...userPublicSelect,
      department: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
  return ok({ users });
});
