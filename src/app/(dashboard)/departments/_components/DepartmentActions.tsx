'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface FlatDept {
  id: string;
  name: string;
  parentId: string | null;
  path?: string | null;
}

interface Props {
  department: {
    id: string;
    name: string;
    parentId: string | null;
    headId: string | null;
    head: { id: string; name: string; email: string } | null;
  };
  flat: FlatDept[];
  users: { id: string; name: string; email: string }[];
  onClose: () => void;
}

type View = 'menu' | 'move' | 'assignHead';

export default function DepartmentActions({ department, flat, users, onClose }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>('menu');
  const [pending, setPending] = useState<string | null>(null);

  const [newParentId, setNewParentId] = useState<string>(department.parentId ?? '');
  const [newHeadId, setNewHeadId] = useState<string>(department.headId ?? '');

  // Exclude self and all descendants from parent candidates.
  // Uses `path` when available; falls back to walking parentId chain.
  const descendants = computeDescendants(department.id, flat);
  const parentCandidates = flat.filter(
    (d) => d.id !== department.id && !descendants.has(d.id)
  );

  async function callApi(label: string, url: string, method: string, body?: unknown) {
    setPending(label);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Request failed');
      }
      toast.success(`${label} succeeded`);
      router.refresh();
      onClose();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
      return false;
    } finally {
      setPending(null);
    }
  }

  async function handleMove() {
    const target = newParentId || null;
    if (target === department.parentId) {
      onClose();
      return;
    }
    await callApi('Move department', `/api/departments/${department.id}/parent`, 'PATCH', {
      parentId: target,
    });
  }

  async function handleAssignHead() {
    if (!newHeadId) {
      toast.error('Select an employee.');
      return;
    }
    await callApi('Assign head', `/api/departments/${department.id}/head`, 'PATCH', {
      headId: newHeadId,
    });
  }

  async function handleRemoveHead() {
    await callApi('Remove head', `/api/departments/${department.id}/head`, 'DELETE');
  }

  return (
    <Modal onClose={onClose} title={`Actions · ${department.name}`}>
      {view === 'menu' && (
        <div className="space-y-1">
          <MenuItem
            label="Move to another parent"
            hint="Reassign this department under a different parent."
            onClick={() => setView('move')}
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            }
          />
          <MenuItem
            label={department.head ? 'Change department head' : 'Assign department head'}
            hint={department.head ? `Current: ${department.head.name}` : 'No head assigned.'}
            onClick={() => setView('assignHead')}
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            }
          />
          {department.head && (
            <MenuItem
              label="Remove department head"
              hint="Unassign the current head."
              onClick={handleRemoveHead}
              danger
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              }
            />
          )}
        </div>
      )}

      {view === 'move' && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              New parent department
            </span>
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              disabled={!!pending}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">None (top-level)</option>
              {parentCandidates.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Self and descendants are excluded to prevent cycles.
            </p>
          </label>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setView('menu')}
              disabled={!!pending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back
            </button>
            <button
              onClick={handleMove}
              disabled={!!pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? 'Moving…' : 'Move'}
            </button>
          </div>
        </div>
      )}

      {view === 'assignHead' && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Department head
            </span>
            <select
              value={newHeadId}
              onChange={(e) => setNewHeadId(e.target.value)}
              disabled={!!pending}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">— Select an active employee —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} · {u.email}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Only active employees can be assigned as head.
            </p>
          </label>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setView('menu')}
              disabled={!!pending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back
            </button>
            <button
              onClick={handleAssignHead}
              disabled={!!pending || !newHeadId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? 'Saving…' : department.head ? 'Change head' : 'Assign head'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Descendant walker (client-side, for filtering the parent picker)
// ---------------------------------------------------------------------

function computeDescendants(rootId: string, flat: FlatDept[]): Set<string> {
  const childrenOf = new Map<string, string[]>();
  flat.forEach((d) => {
    if (d.parentId) {
      if (!childrenOf.has(d.parentId)) childrenOf.set(d.parentId, []);
      childrenOf.get(d.parentId)!.push(d.id);
    }
  });

  const out = new Set<string>();
  const stack = [...(childrenOf.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return out;
}

// ---------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------

function MenuItem({
  label,
  hint,
  onClick,
  icon,
  danger,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        danger
          ? 'hover:bg-rose-50 dark:hover:bg-rose-950/30'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <svg
        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
          danger ? 'text-rose-500' : 'text-slate-400'
        }`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
      >
        {icon}
      </svg>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
          {label}
        </p>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
    </button>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}