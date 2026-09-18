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

  const { from, to, userId, skip, take } = parsed.data;
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

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
    prisma.attendance.count({ where }),
  ]);

  return ok({ records, total });
}, ['ADMIN', 'HR_MANAGER']);
