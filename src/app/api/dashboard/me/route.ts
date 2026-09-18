import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, _context, actor) => {
  const today = utcDay();
  const [todayAttendance, myLeaves, unreadNotifications] = await Promise.all([
    prisma.attendance.findFirst({ where: { userId: actor.id, date: today } }),
    prisma.leaveRequest.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
  ]);

  return ok({
    todayAttendance,
    myLeaves,
    unreadNotifications,
  });
});
