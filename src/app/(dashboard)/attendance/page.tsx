import { redirect } from 'next/navigation';

import ClockWidget from './_components/ClockWidget';
import AttendanceStatsCards from './_components/AttendanceStatsCards';
import AttendanceTable from './_components/AttendanceTable';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    userId?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 25;

function startOfDayUTC(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfDayUTC(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function parseDate(input: string | undefined, fallback: Date): Date {
  if (!input) return fallback;
  const d = new Date(input);
  return isNaN(d.getTime()) ? fallback : d;
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';
  const isManager = role === 'ADMIN' || role === 'HR_MANAGER';

  const params = await searchParams;
  const today = startOfDayUTC(new Date());
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 6); // last 7 days

  const from = startOfDayUTC(parseDate(params.from, defaultFrom));
  const to = endOfDayUTC(parseDate(params.to, today));
  const filterUserId = isManager ? (params.userId ?? '') : session.id;
  const page = Math.max(parseInt(params.page ?? '1', 10) || 1, 1);
  const skip = (page - 1) * PAGE_SIZE;

  // -------------------- Today snapshot for the clock widget --------------------
  const todayRecord = await prisma.attendance.findFirst({
    where: { userId: session.id, date: today },
    select: { id: true, clockIn: true, clockOut: true },
  });

  // -------------------- Role-scoped listing --------------------
  const where: Record<string, unknown> = {
    date: { gte: from, lte: to },
  };
  if (!isManager) {
    where.userId = session.id;
  } else if (filterUserId) {
    where.userId = filterUserId;
  }

  const [records, total, users] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { clockIn: 'desc' }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        date: true,
        clockIn: true,
        clockOut: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.attendance.count({ where }),
    isManager
      ? prisma.user.findMany({
          where: { deletedAt: null, deactivatedAt: null },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  // -------------------- Org-wide stats (admin/hr only) --------------------
  let stats: null | {
    presentToday: number;
    absentToday: number;
    notClockedOut: number;
    totalEmployees: number;
  } = null;

  if (isManager) {
    const [totalEmployees, presentToday, notClockedOut] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, deactivatedAt: null, status: 'ACTIVE' } }),
      prisma.attendance.count({ where: { date: today } }),
      prisma.attendance.count({ where: { date: today, clockOut: null } }),
    ]);
    stats = {
      presentToday,
      absentToday: Math.max(totalEmployees - presentToday, 0),
      notClockedOut,
      totalEmployees,
    };
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {isManager ? 'Attendance' : 'My Attendance'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isManager
            ? 'Track attendance across the organization.'
            : 'Clock in, clock out, and review your attendance history.'}
        </p>
      </header>

      {/* Clock widget — all roles */}
      <ClockWidget
        today={
          todayRecord
            ? {
                clockIn: todayRecord.clockIn.toISOString(),
                clockOut: todayRecord.clockOut ? todayRecord.clockOut.toISOString() : null,
              }
            : null
        }
      />

      {/* Stats — manager only */}
      {stats && <AttendanceStatsCards stats={stats} />}

      {/* Table */}
      <AttendanceTable
        records={records.map((r) => ({
          id: r.id,
          date: r.date.toISOString(),
          clockIn: r.clockIn.toISOString(),
          clockOut: r.clockOut ? r.clockOut.toISOString() : null,
          user: {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            profileImage: r.user.profileImage,
            department: r.user.department,
          },
        }))}
        users={users}
        isManager={isManager}
        filters={{
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
          userId: filterUserId,
        }}
        pagination={{ page, totalPages, total }}
      />
    </div>
  );
}