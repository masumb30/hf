'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
  initial: { action: string; entityType: string; actorId: string };
  actors: { id: string; name: string; email: string }[];
  actions: string[];
  entities: string[];
}

export default function ActivityFilters({ initial, actors, actions, entities }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [action, setAction] = useState(initial.action);
  const [entityType, setEntityType] = useState(initial.entityType);
  const [actorId, setActorId] = useState(initial.actorId);

  function apply(next: Partial<{ action: string; entityType: string; actorId: string; page: string }>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { action, entityType, actorId, page: '1', ...next };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
      else params.delete(k);
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function clearAll() {
    setAction('');
    setEntityType('');
    setActorId('');
    startTransition(() => router.push(pathname));
  }

  const hasFilters = !!(initial.action || initial.entityType || initial.actorId);

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900 ${
        isPending ? 'opacity-60' : ''
      }`}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Action
          </span>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); apply({ action: e.target.value }); }}
            className={inputCls}
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Entity type
          </span>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); apply({ entityType: e.target.value }); }}
            className={inputCls}
          >
            <option value="">All entities</option>
            {entities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Actor
          </span>
          <select
            value={actorId}
            onChange={(e) => { setActorId(e.target.value); apply({ actorId: e.target.value }); }}
            className={inputCls}
          >
            <option value="">All actors</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>{a.name} · {a.email}</option>
            ))}
          </select>
        </label>
      </div>

      {hasFilters && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={clearAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}