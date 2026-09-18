import { prisma, Prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { attendanceListQuerySchema } from '@/lib/validation/attendance.schema';
import { parseSearchParams } from '@/lib/validation/common';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async (req) => {
  const parsed = parseSearchParams(
    attendanceListQuerySchema,
    new URL(req.url).searchParams
  );
  if (!parsed.success) return fail(parsed.message);

  const { from, to, userId } = parsed.data;
  const where: Prisma.AttendanceWhereInput = {
    ...(userId ? { userId } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: utcDay(from) } : {}),
            ...(to ? { lte: utcDay(to) } : {}),
          },
        }
      : {}),
  };

  const records = await prisma.attendance.findMany({ where });
  const presentDays = records.length;
  const completed = records.filter((r) => r.clockOut);
  const totalHours = completed.reduce((sum, r) => {
    return sum + (r.clockOut!.getTime() - r.clockIn.getTime()) / 36e5;
  }, 0);
  const uniqueUsers = new Set(records.map((r) => r.userId)).size;

  return ok({
    presentDays,
    uniqueUsers,
    completedShifts: completed.length,
    totalHours: Number(totalHours.toFixed(2)),
    averageHours: completed.length
      ? Number((totalHours / completed.length).toFixed(2))
      : 0,
  });
}, ['ADMIN', 'HR_MANAGER']);
