import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async () => {
  const today = utcDay();
  const [
    employees,
    pendingLeaves,
    todaysAttendance,
    departments,
  ] = await Promise.all([
    prisma.user.count({
      where: { deletedAt: null, role: 'EMPLOYEE' },
    }),
    prisma.leaveRequest.count({
      where: { status: 'PENDING', user: { role: 'EMPLOYEE' } },
    }),
    prisma.attendance.count({ where: { date: today } }),
    prisma.department.count(),
  ]);

  return ok({
    employees,
    pendingLeaves,
    todaysAttendance,
    departments,
  });
}, ['HR_MANAGER']);
