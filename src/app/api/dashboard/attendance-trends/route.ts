import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async (req) => {
  const days = Number(new URL(req.url).searchParams.get('days') ?? 14);
  const start = utcDay(new Date(Date.now() - Math.min(days, 90) * 24 * 60 * 60 * 1000));
  const records = await prisma.attendance.findMany({
    where: { date: { gte: start } },
    select: { date: true, userId: true },
  });

  const byDate = new Map<string, Set<string>>();
  for (const record of records) {
    const key = record.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, new Set());
    byDate.get(key)!.add(record.userId);
  }

  const trends = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, users]) => ({ date, count: users.size }));

  return ok({ trends });
}, ['ADMIN', 'HR_MANAGER']);
