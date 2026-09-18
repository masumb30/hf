import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

interface StatCard {
  label: string;
  value: number | string;
  hint?: string;
  accent: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
}

// ---------------------------------------------------------------
// Stat card (server-rendered, no client needed)
// ---------------------------------------------------------------

function StatCardView({ label, value, hint, accent }: StatCard) {
  const accents: Record<StatCard['accent'], string> = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${accents[accent]}`}>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// ---------------------------------------------------------------
// Admin / HR dashboard
// ---------------------------------------------------------------

async function AdminHrDashboard({ role }: { role: 'ADMIN' | 'HR_MANAGER' }) {
  const today = startOfTodayUTC();

  const [
    totalEmployees,
    totalDepartments,
    presentToday,
    notClockedOut,
    pendingLeavesRaw,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, deactivatedAt: null } }),
    prisma.department.count(),
    prisma.attendance.count({ where: { date: today } }),
    prisma.attendance.count({ where: { date: today, clockOut: null } }),
    prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      select: { id: true, userId: true, user: { select: { role: true } } },
    }),
  ]);

  // HR sees only HR-actionable pending (EMPLOYEE-originated).
  // Admin sees all.
  const pendingLeaves = role === 'HR_MANAGER'
    ? pendingLeavesRaw.filter((l) => l.user.role === 'EMPLOYEE').length
    : pendingLeavesRaw.length;

  const absentToday = Math.max(totalEmployees - presentToday, 0);

  const stats: StatCard[] = [
    { label: 'Total employees', value: totalEmployees, accent: 'indigo' },
    { label: 'Present today', value: presentToday, accent: 'emerald' },
    { label: 'Absent today', value: absentToday, accent: 'slate' },
    { label: 'Pending leave requests', value: pendingLeaves, hint: notClockedOut > 0 ? `${notClockedOut} not clocked out` : undefined, accent: 'amber' },
  ];

  const recentLeaves = await prisma.leaveRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { name: true, email: true, role: true } } },
  });

  const recentActivities = role === 'ADMIN'
    ? await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { actor: { select: { name: true } } },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCardView key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending leaves */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Pending leave requests
            </h2>
            <Link
              href="/leave"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all
            </Link>
          </div>
          {recentLeaves.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No pending requests.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLeaves.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {l.user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {l.leaveType} · {formatDateTime(l.startDate)} → {formatDateTime(l.endDate)}
                    </p>
                  </div>
                  <Link
                    href={`/leave/${l.id}`}
                    className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity (admin only) or HR hint */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {role === 'ADMIN' ? 'Recent activity' : 'Team overview'}
            </h2>
            {role === 'ADMIN' && (
              <Link
                href="/activity"
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                View all
              </Link>
            )}
          </div>

          {role === 'ADMIN' ? (
            recentActivities.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentActivities.map((a) => (
                  <li key={a.id} className="py-3">
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      <span className="font-medium">{a.actor?.name ?? 'System'}</span>{' '}
                      <span className="text-slate-500 dark:text-slate-400">{a.action}</span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDateTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="space-y-3 py-2 text-sm text-slate-600 dark:text-slate-400">
              <p>
                You&apos;re signed in as <span className="font-medium text-slate-900 dark:text-slate-100">HR Manager</span>.
              </p>
              <p className="text-xs">
                You can manage employees, departments, attendance, and review employee leave
                requests. HR-originated leave requests require Admin approval.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Employee dashboard
// ---------------------------------------------------------------

async function EmployeeDashboard({ userId }: { userId: string }) {
  const today = startOfTodayUTC();

  const [
    todayAttendance,
    pendingLeaves,
    myRecentLeaves,
    unreadNotifications,
    myDepartment,
  ] = await Promise.all([
    prisma.attendance.findFirst({ where: { userId, date: today } }),
    prisma.leaveRequest.count({ where: { userId, status: 'PENDING' } }),
    prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        department: { select: { id: true, name: true } },
      },
    }),
  ]);

  const attendanceLabel = !todayAttendance
    ? 'Not clocked in'
    : todayAttendance.clockOut
      ? 'Clocked out'
      : 'Clocked in';

  const stats: StatCard[] = [
    {
      label: 'Today',
      value: attendanceLabel,
      hint: todayAttendance?.clockIn
        ? `In: ${formatDateTime(todayAttendance.clockIn)}`
        : undefined,
      accent: todayAttendance?.clockOut
        ? 'slate'
        : todayAttendance
          ? 'emerald'
          : 'amber',
    },
    { label: 'Pending leave', value: pendingLeaves, accent: 'indigo' },
    { label: 'Unread notifications', value: unreadNotifications, accent: 'rose' },
    {
      label: 'Department',
      value: myDepartment?.department?.name ?? 'Unassigned',
      accent: 'slate',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCardView key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* My recent leave */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              My recent leave requests
            </h2>
            <Link
              href="/leave"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all
            </Link>
          </div>
          {myRecentLeaves.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              You haven&apos;t submitted any leave requests yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {myRecentLeaves.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {l.leaveType}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(l.startDate)} → {formatDateTime(l.endDate)}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick actions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/attendance"
              className="rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
            >
              Clock in / out
            </Link>
            <Link
              href="/leave"
              className="rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
            >
              Request leave
            </Link>
            <Link
              href="/messages"
              className="rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
            >
              Messages
            </Link>
            <Link
              href="/departments"
              className="rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
            >
              Departments
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map.CANCELLED}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ---------------------------------------------------------------
// Page
// ---------------------------------------------------------------

export default async function DashboardPage() {
  const session = await getSession();
  console.log(session);
  if (!session) redirect('/sign-in');

  const role = session.role as 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';
  const firstName = session.name?.split(' ')[0] ?? 'there';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Here&apos;s what&apos;s happening across your organization today.
        </p>
      </header>

      {(role === 'ADMIN' || role === 'HR_MANAGER') ? (
        <AdminHrDashboard role={role} />
      ) : (
        <EmployeeDashboard userId={session.id} />
      )}
    </div>
  );
}