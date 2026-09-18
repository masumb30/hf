import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async () => {
  const activities = await prisma.auditLog.findMany({
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return ok({ activities });
}, ['ADMIN', 'HR_MANAGER']);
