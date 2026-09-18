import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, _context, actor) => {
  const from = utcDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const records = await prisma.attendance.findMany({
    where: { userId: actor.id, date: { gte: from } },
  });
  const completed = records.filter((r) => r.clockOut);
  const totalHours = completed.reduce((sum, r) => {
    return sum + (r.clockOut!.getTime() - r.clockIn.getTime()) / 36e5;
  }, 0);

  return ok({
    last30Days: records.length,
    completedShifts: completed.length,
    totalHours: Number(totalHours.toFixed(2)),
    today: records.find((r) => r.date.getTime() === utcDay().getTime()) ?? null,
  });
});
