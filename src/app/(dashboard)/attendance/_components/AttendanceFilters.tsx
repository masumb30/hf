'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
  users: { id: string; name: string; email: string }[];
  isManager: boolean;
  initial: { from: string; to: string; userId: string };
}

export default function AttendanceFilters({ users, isManager, initial }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [userId, setUserId] = useState(initial.userId);

  function apply(next: Partial<{ from: string; to: string; userId: string; page: string }>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { from, to, userId, page: '1', ...next };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
      else params.delete(k);
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  // Debounce date changes
  useEffect(() => {
    const t = setTimeout(() => {
      if (from !== initial.from || to !== initial.to) apply({ from, to });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function quickRange(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const f = start.toISOString().slice(0, 10);
    const t = end.toISOString().slice(0, 10);
    setFrom(f);
    setTo(t);
    apply({ from: f, to: t });
  }

  function clearFilters() {
    setUserId('');
    apply({ userId: '' });
  }

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900 ${
        isPending ? 'opacity-60' : ''
      }`}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            From
          </span>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            To
          </span>
          <input
            type="date"
            value={to}
            min={from}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls}
          />
        </label>

        {isManager && (
          <label className="block md:col-span-2">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Employee
            </span>
            <select
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                apply({ userId: e.target.value });
              }}
              className={inputCls}
            >
              <option value="">All employees</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => quickRange(1)}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Today
        </button>
        <button
          onClick={() => quickRange(7)}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Last 7 days
        </button>
        <button
          onClick={() => quickRange(30)}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Last 30 days
        </button>
        {isManager && userId && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear employee filter
          </button>
        )}
      </div>
    </div>
  );
}