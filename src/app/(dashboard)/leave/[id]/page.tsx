import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import LeaveReviewActions from './_components/LeaveReviewActions';

interface PageProps {
  params: Promise<{ id: string }>;
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  ANNUAL: 'Annual',
  SICK: 'Sick',
  UNPAID: 'Unpaid',
  MATERNITY: 'Maternity',
  PATERNITY: 'Paternity',
  COMPASSIONATE: 'Compassionate',
  OTHER: 'Other',
};

function fmtDate(iso: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(iso);
}

function fmtDateTime(iso: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(iso);
}

function dayCount(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(Math.round(ms / 86400000) + 1, 1);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? map.CANCELLED}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// Server-side mirror of canReviewLeave (Option B)
function canReviewLeave(
  actor: { id: string; role: string },
  target: { id: string; role: string; status: string }
): boolean {
  if (actor.id === target.id) return false;
  if (target.status !== 'ACTIVE') return false;
  if (target.role === 'EMPLOYEE') return actor.role === 'ADMIN' || actor.role === 'HR_MANAGER';
  if (target.role === 'HR_MANAGER') return actor.role === 'ADMIN';
  if (target.role === 'ADMIN') return actor.role === 'ADMIN' && actor.id !== target.id;
  return false;
}

export default async function LeaveDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';
  const { id } = await params;

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          profileImage: true,
          position: true,
          department: { select: { id: true, name: true } },
        },
      },
      reviewer: { select: { id: true, name: true } },
    },
  });

  if (!request) notFound();

  const isOwner = request.userId === session.id;
  const isManager = role === 'ADMIN' || role === 'HR_MANAGER';

  // Access: owner, or manager (server-side authorization is enforced on the API,
  // this just blocks direct URL access to someone else's record).
  if (!isOwner && !isManager) notFound();

  const canAct = request.status === 'PENDING' && canReviewLeave(
    { id: session.id, role },
    { id: request.user.id, role: request.user.role, status: request.user.status }
  );

  const canCancel = isOwner && request.status === 'PENDING';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <nav className="text-xs text-slate-500 dark:text-slate-400">
        <Link href="/leave" className="hover:text-slate-900 dark:hover:text-slate-200">
          Leave requests
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-900 dark:text-slate-200">
          {LEAVE_TYPE_LABEL[request.leaveType] ?? request.leaveType}
        </span>
      </nav>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {LEAVE_TYPE_LABEL[request.leaveType] ?? request.leaveType} leave
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Submitted {fmtDateTime(request.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={request.status} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Request details
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label="Start date" value={fmtDate(request.startDate)} />
              <Detail label="End date" value={fmtDate(request.endDate)} />
              <Detail label="Duration" value={`${dayCount(request.startDate, request.endDate)} day(s)`} />
              <Detail label="Type" value={LEAVE_TYPE_LABEL[request.leaveType] ?? request.leaveType} />
            </dl>

            <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Reason
              </p>
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {request.reason}
              </p>
            </div>
          </section>

          {request.status !== 'PENDING' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Review
              </h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Detail
                  label="Reviewed by"
                  value={request.reviewer?.name ?? '—'}
                />
                <Detail
                  label="Reviewed at"
                  value={request.reviewedAt ? fmtDateTime(request.reviewedAt) : '—'}
                />
              </dl>
              {request.reviewNote && (
                <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Reviewer note
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                    {request.reviewNote}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar: requester + actions */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Requester
            </h2>
            <Link href={`/employees/${request.user.id}`} className="flex items-center gap-3">
              <UserAvatar user={request.user} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {request.user.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {request.user.email}
                </p>
              </div>
            </Link>
            <div className="mt-4 space-y-2 text-sm">
              <Detail label="Role" value={
                request.user.role === 'HR_MANAGER' ? 'HR Manager' :
                request.user.role.charAt(0) + request.user.role.slice(1).toLowerCase()
              } />
              <Detail label="Department" value={request.user.department?.name ?? '—'} />
              <Detail label="Position" value={request.user.position ?? '—'} />
            </div>
          </section>

          {(canAct || canCancel) && (
            <LeaveReviewActions
              requestId={request.id}
              status={request.status}
              canAct={canAct}
              canCancel={canCancel}
            />
          )}

          {!canAct && request.status === 'PENDING' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              {isOwner
                ? 'You cannot review your own leave request.'
                : role === 'HR_MANAGER' && request.user.role !== 'EMPLOYEE'
                  ? 'This request requires admin approval.'
                  : 'You do not have permission to review this request.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function UserAvatar({ user }: { user: { name: string; profileImage: string | null } }) {
  const initials = user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  if (user.profileImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.profileImage} alt={user.name} className="h-10 w-10 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
      {initials}
    </span>
  );
}