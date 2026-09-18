'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';

interface RequestRow {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    profileImage: string | null;
    department: { id: string; name: string } | null;
  };
  reviewer: { id: string; name: string } | null;
}

interface Counts {
  ALL: number;
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  CANCELLED: number;
}

interface Props {
  requests: RequestRow[];
  view: 'mine' | 'review';
  role: 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';
  currentUserId: string;
  counts: Counts | null;
  activeStatus: string;
  pagination: { page: number; totalPages: number; total: number };
}

// ---------------------------------------------------------------------
// canReviewLeave — mirrors server rule (Option B)
// ---------------------------------------------------------------------
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

const LEAVE_TYPE_LABEL: Record<string, string> = {
  ANNUAL: 'Annual',
  SICK: 'Sick',
  UNPAID: 'Unpaid',
  MATERNITY: 'Maternity',
  PATERNITY: 'Paternity',
  COMPASSIONATE: 'Compassionate',
  OTHER: 'Other',
};

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

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function dayCount(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(Math.round(ms / 86400000) + 1, 1);
}

export default function LeaveTable({
  requests,
  view,
  role,
  currentUserId,
  counts,
  activeStatus,
  pagination,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [actioning, setActioning] = useState<string | null>(null);

  function setStatus(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'ALL') params.delete('status');
    else params.set('status', status);
    params.set('page', '1');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function gotoPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function act(id: string, action: 'approve' | 'reject' | 'cancel') {
    setActioning(id + ':' + action);
    try {
      const res = await fetch(`/api/leave/${id}/${action}`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Request failed');
      }
      toast.success(
        action === 'approve' ? 'Leave approved' :
        action === 'reject' ? 'Leave rejected' :
        'Leave cancelled'
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setActioning(null);
    }
  }

  const statusTabs: { key: string; label: string; count?: number }[] = [
    { key: 'ALL', label: 'All', count: counts?.ALL },
    { key: 'PENDING', label: 'Pending', count: counts?.PENDING },
    { key: 'APPROVED', label: 'Approved', count: counts?.APPROVED },
    { key: 'REJECTED', label: 'Rejected', count: counts?.REJECTED },
    { key: 'CANCELLED', label: 'Cancelled', count: counts?.CANCELLED },
  ];

  return (
    <div className="space-y-4">
      {/* Status tabs (mine view only) */}
      {view === 'mine' && counts && (
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((t) => {
            const active = activeStatus === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
                {typeof t.count === 'number' && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900 ${
          isPending ? 'opacity-60' : ''
        }`}
      >
        {requests.length === 0 ? (
          <EmptyState view={view} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-950/50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {view === 'review' && <th className="px-4 py-3">Employee</th>}
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {requests.map((r) => {
                    const showActions = view === 'review' && r.status === 'PENDING';
                    const canAct = showActions &&
                      canReviewLeave(
                        { id: currentUserId, role },
                        { id: r.user.id, role: r.user.role, status: 'ACTIVE' }
                      );
                    const isOwn = r.user.id === currentUserId;
                    const canCancel = view === 'mine' && r.status === 'PENDING' && isOwn;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        {view === 'review' && (
                          <td className="px-4 py-3">
                            <Link href={`/employees/${r.user.id}`} className="flex items-center gap-2">
                              <UserAvatar user={r.user} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {r.user.name}
                                </p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {r.user.role === 'HR_MANAGER' ? 'HR Manager' :
                                   r.user.role.charAt(0) + r.user.role.slice(1).toLowerCase()}
                                </p>
                              </div>
                            </Link>
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {LEAVE_TYPE_LABEL[r.leaveType] ?? r.leaveType}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {dayCount(r.startDate, r.endDate)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/leave/${r.id}`}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                            >
                              View
                            </Link>
                            {canAct && (
                              <>
                                <button
                                  onClick={() => act(r.id, 'approve')}
                                  disabled={actioning === r.id + ':approve'}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  {actioning === r.id + ':approve' ? '…' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => act(r.id, 'reject')}
                                  disabled={actioning === r.id + ':reject'}
                                  className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                                >
                                  {actioning === r.id + ':reject' ? '…' : 'Reject'}
                                </button>
                              </>
                            )}
                            {showActions && !canAct && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {isOwn ? 'Awaiting another admin' :
                                 role === 'HR_MANAGER' ? 'Awaiting admin' :
                                 'Not actionable'}
                              </span>
                            )}
                            {canCancel && (
                              <button
                                onClick={() => act(r.id, 'cancel')}
                                disabled={actioning === r.id + ':cancel'}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                {actioning === r.id + ':cancel' ? '…' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {requests.map((r) => {
                const showActions = view === 'review' && r.status === 'PENDING';
                const canAct = showActions &&
                  canReviewLeave(
                    { id: currentUserId, role },
                    { id: r.user.id, role: r.user.role, status: 'ACTIVE' }
                  );
                const isOwn = r.user.id === currentUserId;
                const canCancel = view === 'mine' && r.status === 'PENDING' && isOwn;

                return (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {view === 'review' && (
                          <div className="mb-2 flex items-center gap-2">
                            <UserAvatar user={r.user} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                {r.user.name}
                              </p>
                              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {r.user.role === 'HR_MANAGER' ? 'HR Manager' :
                                 r.user.role.charAt(0) + r.user.role.slice(1).toLowerCase()}
                              </p>
                            </div>
                          </div>
                        )}
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {LEAVE_TYPE_LABEL[r.leaveType] ?? r.leaveType}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {fmtDate(r.startDate)} → {fmtDate(r.endDate)} · {dayCount(r.startDate, r.endDate)}d
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/leave/${r.id}`}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        View
                      </Link>
                      {canAct && (
                        <>
                          <button
                            onClick={() => act(r.id, 'approve')}
                            disabled={actioning === r.id + ':approve'}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => act(r.id, 'reject')}
                            disabled={actioning === r.id + ':reject'}
                            className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {showActions && !canAct && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {isOwn ? 'Awaiting another admin' :
                           role === 'HR_MANAGER' ? 'Awaiting admin' :
                           'Not actionable'}
                        </span>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => act(r.id, 'cancel')}
                          disabled={actioning === r.id + ':cancel'}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} requests
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => gotoPage(pagination.page - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => gotoPage(pagination.page + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------

function UserAvatar({
  user,
  size = 'md',
}: {
  user: { name: string; profileImage: string | null };
  size?: 'sm' | 'md';
}) {
  const initials = user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const cls = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-[11px]';
  if (user.profileImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.profileImage} alt={user.name} className={`${cls} rounded-full object-cover`} />;
  }
  return (
    <span className={`flex ${cls} items-center justify-center rounded-full bg-indigo-600 font-bold text-white`}>
      {initials}
    </span>
  );
}

function EmptyState({ view }: { view: 'mine' | 'review' }) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {view === 'review' ? 'Nothing to review' : 'No leave requests yet'}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {view === 'review'
          ? 'The queue is empty. Check back later.'
          : 'Submit your first leave request to see it here.'}
      </p>
    </div>
  );
}