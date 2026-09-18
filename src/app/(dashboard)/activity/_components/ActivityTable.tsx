'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface LogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
    role: string;
  } | null;
}

interface Props {
  logs: LogRow[];
  pagination: { page: number; totalPages: number; total: number };
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function actionColor(action: string): string {
  if (action.includes('CREATED')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
  if (action.includes('DELETED') || action.includes('TERMINATED') || action.includes('REJECTED'))
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
  if (action.includes('UPDATED') || action.includes('APPROVED'))
    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300';
  if (action.includes('DEACTIVATED')) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function avatarInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function ActivityTable({ logs, pagination }: Props) {
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
      <div
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900 ${
          isPending ? 'opacity-60' : ''
        }`}
      >
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              No activity logs match your filters
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try adjusting or clearing filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-950/50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {fmtDateTime(l.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {l.actor ? (
                          <Link href={`/employees/${l.actor.id}`} className="flex items-center gap-2">
                            {l.actor.profileImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.actor.profileImage} alt={l.actor.name} className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                {avatarInitials(l.actor.name)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                {l.actor.name}
                              </p>
                              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {l.actor.email}
                              </p>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColor(l.action)}`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {l.entityType}
                        </p>
                        {l.entityId && (
                          <p className="truncate font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {l.entityId}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {l.metadata ? (
                          <details className="cursor-pointer">
                            <summary className="hover:text-slate-900 dark:hover:text-slate-200">
                              view
                            </summary>
                            <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-slate-100 p-2 text-[10px] dark:bg-slate-800">
                              {JSON.stringify(l.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {logs.map((l) => (
                <div key={l.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${actionColor(l.action)}`}>
                        {l.action}
                      </span>
                      <p className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {l.entityType}
                        {l.entityId && (
                          <span className="ml-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            · {l.entityId.slice(0, 8)}
                          </span>
                        )}
                      </p>
                      {l.actor && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          by <span className="font-medium text-slate-700 dark:text-slate-300">{l.actor.name}</span>
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] whitespace-nowrap text-slate-400 dark:text-slate-500">
                      {fmtDateTime(l.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
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