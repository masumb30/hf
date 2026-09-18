'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import AttendanceFilters from './AttendanceFilters';

interface Record {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
    department: { id: string; name: string } | null;
  };
}

interface Props {
  records: Record[];
  users: { id: string; name: string; email: string }[];
  isManager: boolean;
  filters: { from: string; to: string; userId: string };
  pagination: { page: number; totalPages: number; total: number };
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function duration(inIso: string, outIso: string | null): string {
  if (!outIso) return '—';
  const ms = new Date(outIso).getTime() - new Date(inIso).getTime();
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function statusPill(clockOut: string | null) {
  return clockOut
    ? { label: 'Complete', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' }
    : { label: 'Open', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' };
}

export default function AttendanceTable({
  records,
  users,
  isManager,
  filters,
  pagination,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function gotoPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      <AttendanceFilters users={users} isManager={isManager} initial={filters} />

      <div
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900 ${
          isPending ? 'opacity-60' : ''
        }`}
      >
        {records.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              No attendance records
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try widening your date range or clearing the employee filter.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-950/50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">Date</th>
                    {isManager && <th className="px-4 py-3">Employee</th>}
                    <th className="px-4 py-3">Clock in</th>
                    <th className="px-4 py-3">Clock out</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.map((r) => {
                    const st = statusPill(r.clockOut);
                    const initials = r.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {fmtDate(r.date)}
                        </td>
                        {isManager && (
                          <td className="px-4 py-3">
                            <Link href={`/employees/${r.user.id}`} className="flex items-center gap-2">
                              {r.user.profileImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.user.profileImage} alt={r.user.name} className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                                  {initials}
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {r.user.name}
                                </p>
                                {r.user.department && (
                                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {r.user.department.name}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                          {fmtTime(r.clockIn)}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                          {r.clockOut ? fmtTime(r.clockOut) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                          {duration(r.clockIn, r.clockOut)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {records.map((r) => {
                const st = statusPill(r.clockOut);
                return (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {isManager && (
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {r.user.name}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(r.date)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">In</p>
                        <p className="tabular-nums text-slate-900 dark:text-slate-100">{fmtTime(r.clockIn)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Out</p>
                        <p className="tabular-nums text-slate-900 dark:text-slate-100">
                          {r.clockOut ? fmtTime(r.clockOut) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Duration</p>
                        <p className="tabular-nums text-slate-900 dark:text-slate-100">
                          {duration(r.clockIn, r.clockOut)}
                        </p>
                      </div>
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
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
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