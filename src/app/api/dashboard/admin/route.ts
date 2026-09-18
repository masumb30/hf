import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async () => {
  const today = utcDay();
  const [
    users,
    activeUsers,
    departments,
    pendingLeaves,
    todaysAttendance,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: { deletedAt: null, status: 'ACTIVE', deactivatedAt: null },
    }),
    prisma.department.count(),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.attendance.count({ where: { date: today } }),
  ]);

  return ok({
    users,
    activeUsers,
    departments,
    pendingLeaves,
    todaysAttendance,
  });
}, ['ADMIN']);
