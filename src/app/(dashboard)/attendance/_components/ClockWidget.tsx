'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface Props {
  today: { clockIn: string; clockOut: string | null } | null;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ClockWidget({ today }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [pending, setPending] = useState<'in' | 'out' | null>(null);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const status: 'NOT_IN' | 'IN' | 'OUT' = !today
    ? 'NOT_IN'
    : today.clockOut
      ? 'OUT'
      : 'IN';

  const statusLabel =
    status === 'NOT_IN' ? 'Not clocked in' :
    status === 'IN' ? 'Clocked in' :
    'Clocked out';

  const statusColor =
    status === 'NOT_IN' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
    status === 'IN' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

  // Duration since clock in (live) if currently clocked in
  const liveDuration =
    status === 'IN' && today
      ? now.getTime() - new Date(today.clockIn).getTime()
      : null;

  // Total duration today if clocked out
  const totalDuration =
    status === 'OUT' && today && today.clockOut
      ? new Date(today.clockOut).getTime() - new Date(today.clockIn).getTime()
      : null;

  async function handleClockIn() {
    setPending('in');
    try {
      const res = await fetch('/api/attendance/clock-in', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Clock in failed');
      }
      toast.success('Clocked in');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPending(null);
    }
  }

  async function handleClockOut() {
    setPending('out');
    try {
      const res = await fetch('/api/attendance/clock-out', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Clock out failed');
      }
      toast.success('Clocked out');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPending(null);
    }
  }

  const timeString = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now);

  const dateString = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        {/* Clock */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {timeString}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{dateString}</p>
          </div>
        </div>

        {/* Status + action */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col gap-1">
            <span className={`self-start rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            {today && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                In {formatTime(today.clockIn)}
                {today.clockOut && <> · Out {formatTime(today.clockOut)}</>}
              </p>
            )}
            {liveDuration !== null && (
              <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                Working · {formatDuration(liveDuration)}
              </p>
            )}
            {totalDuration !== null && (
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Total · {formatDuration(totalDuration)}
              </p>
            )}
          </div>

          {status === 'NOT_IN' && (
            <button
              onClick={handleClockIn}
              disabled={pending === 'in'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending === 'in' ? 'Clocking in…' : 'Clock in'}
            </button>
          )}
          {status === 'IN' && (
            <button
              onClick={handleClockOut}
              disabled={pending === 'out'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {pending === 'out' ? 'Clocking out…' : 'Clock out'}
            </button>
          )}
          {status === 'OUT' && (
            <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Done for today
            </span>
          )}
        </div>
      </div>
    </div>
  );
}