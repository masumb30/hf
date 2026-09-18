import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async () => {
  const [byStatus, byType] = await Promise.all([
    prisma.leaveRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.leaveRequest.groupBy({
      by: ['leaveType'],
      _count: { _all: true },
    }),
  ]);

  return ok({
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    byType: byType.map((row) => ({ leaveType: row.leaveType, count: row._count._all })),
  });
}, ['ADMIN', 'HR_MANAGER']);
