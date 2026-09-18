import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { attendanceListQuerySchema } from '@/lib/validation/attendance.schema';
import { objectIdSchema, parseSearchParams } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (req, context) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid user id');

  const parsed = parseSearchParams(
    attendanceListQuerySchema,
    new URL(req.url).searchParams
  );
  if (!parsed.success) return fail(parsed.message);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return fail('User not found', 404);

  const { from, to, skip, take } = parsed.data;
  const where = {
    userId: id,
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
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
    prisma.attendance.count({ where }),
  ]);

  return ok({ records, total });
}, ['ADMIN', 'HR_MANAGER']);
