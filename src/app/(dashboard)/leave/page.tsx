import { redirect } from 'next/navigation';

import LeaveTable from './_components/LeaveTable';
import LeaveForm from './_components/LeaveForm';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

interface PageProps {
  searchParams: Promise<{
    view?: string;
    status?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function LeavePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';
  const isManager = role === 'ADMIN' || role === 'HR_MANAGER';

  const params = await searchParams;
  const view = isManager ? (params.view === 'review' ? 'review' : 'mine') : 'mine';
  const statusFilter = params.status ?? '';
  const page = Math.max(parseInt(params.page ?? '1', 10) || 1, 1);
  const skip = (page - 1) * PAGE_SIZE;

  // -------------------- Build where clause --------------------
  const where: Record<string, unknown> = {};

  if (view === 'mine') {
    where.userId = session.id;
  } else if (view === 'review' && isManager) {
    // Admin sees ALL pending. HR sees only EMPLOYEE-originated pending.
    where.status = 'PENDING';
    if (role === 'HR_MANAGER') {
      where.user = { role: 'EMPLOYEE' };
    }
  }

  if (statusFilter && statusFilter !== 'ALL') {
    if (view === 'mine') {
      where.status = statusFilter;
    }
    // On review view, status is always PENDING — ignore the tab filter
  }

  const [requests, total, counts] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            department: { select: { id: true, name: true } },
          },
        },
        reviewer: { select: { id: true, name: true } },
      },
    }),
    prisma.leaveRequest.count({ where }),
    // Counts for status tabs (only needed on "mine")
    view === 'mine'
      ? Promise.all([
          prisma.leaveRequest.count({ where: { userId: session.id } }),
          prisma.leaveRequest.count({ where: { userId: session.id, status: 'PENDING' } }),
          prisma.leaveRequest.count({ where: { userId: session.id, status: 'APPROVED' } }),
          prisma.leaveRequest.count({ where: { userId: session.id, status: 'REJECTED' } }),
          prisma.leaveRequest.count({ where: { userId: session.id, status: 'CANCELLED' } }),
        ]).then(([all, pending, approved, rejected, cancelled]) => ({
          ALL: all,
          PENDING: pending,
          APPROVED: approved,
          REJECTED: rejected,
          CANCELLED: cancelled,
        }))
      : Promise.resolve(null),
  ]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Leave requests
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {view === 'review'
              ? 'Pending requests awaiting your review.'
              : 'Your leave requests and their status.'}
          </p>
        </div>
        {view === 'mine' && <LeaveForm />}
      </header>

      {isManager && (
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/60">
          <TabLink
            label="My requests"
            href="/leave?view=mine"
            active={view === 'mine'}
          />
          <TabLink
            label={role === 'ADMIN' ? 'Review queue' : 'Employee queue'}
            href="/leave?view=review"
            active={view === 'review'}
          />
        </div>
      )}

      <LeaveTable
        requests={requests.map((r) => ({
          id: r.id,
          leaveType: r.leaveType,
          startDate: r.startDate.toISOString(),
          endDate: r.endDate.toISOString(),
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
          reviewNote: r.reviewNote,
          user: {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            role: r.user.role,
            profileImage: r.user.profileImage,
            department: r.user.department,
          },
          reviewer: r.reviewer,
        }))}
        view={view}
        role={role}
        currentUserId={session.id}
        counts={counts}
        activeStatus={statusFilter || 'ALL'}
        pagination={{ page, totalPages, total }}
      />
    </div>
  );
}

function TabLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors ${
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {label}
    </a>
  );
}