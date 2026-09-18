'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import DepartmentForm from '../../_components/DepartmentForm';

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
    description: string | null;
    parentId: string | null;
    headId: string | null;
    head: { id: string; name: string; email: string } | null;
  };
  flat: FlatDept[];
  users: { id: string; name: string; email: string }[];
}

type Dialog = null | 'menu' | 'edit' | 'move' | 'assignHead' | 'addChild';

export default function DepartmentDetailClient({ department, flat, users }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, setPending] = useState<string | null>(null);

  const [newParentId, setNewParentId] = useState<string>(department.parentId ?? '');
  const [newHeadId, setNewHeadId] = useState<string>(department.headId ?? '');

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
      setDialog(null);
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
      setDialog(null);
      return;
    }
    await callApi('Move', `/api/departments/${department.id}/parent`, 'PATCH', { parentId: target });
  }

  async function handleAssignHead() {
    if (!newHeadId) {
      toast.error('Select an employee.');
      return;
    }
    await callApi('Assign head', `/api/departments/${department.id}/head`, 'PATCH', { headId: newHeadId });
  }

  async function handleRemoveHead() {
    await callApi('Remove head', `/api/departments/${department.id}/head`, 'DELETE');
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDialog('addChild')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add sub-department
        </button>
        <button
          onClick={() => setDialog('menu')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Actions
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Edit */}
      {dialog === 'edit' && (
        <DepartmentForm
          mode="edit"
          flat={flat}
          initial={{
            id: department.id,
            name: department.name,
            description: department.description,
            parentId: department.parentId,
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {/* Add child */}
      {dialog === 'addChild' && (
        <DepartmentForm
          mode="create"
          flat={flat}
          initialParentId={department.id}
          onClose={() => setDialog(null)}
        />
      )}

      {/* Menu */}
      {dialog === 'menu' && (
        <Modal onClose={() => setDialog(null)} title={`Actions · ${department.name}`}>
          <div className="space-y-1">
            <MenuItem
              label="Edit details"
              hint="Change name or description."
              onClick={() => setDialog('edit')}
            />
            <MenuItem
              label="Move to another parent"
              hint="Reassign under a different parent."
              onClick={() => setDialog('move')}
            />
            <MenuItem
              label={department.head ? 'Change head' : 'Assign head'}
              hint={department.head ? `Current: ${department.head.name}` : 'No head assigned.'}
              onClick={() => setDialog('assignHead')}
            />
            {department.head && (
              <MenuItem
                label="Remove head"
                hint="Unassign the current head."
                danger
                onClick={handleRemoveHead}
              />
            )}
          </div>
        </Modal>
      )}

      {/* Move */}
      {dialog === 'move' && (
        <Modal onClose={() => setDialog(null)} title="Move department">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              New parent
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
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setDialog('menu')}
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
        </Modal>
      )}

      {/* Assign head */}
      {dialog === 'assignHead' && (
        <Modal onClose={() => setDialog(null)} title={department.head ? 'Change head' : 'Assign head'}>
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
          </label>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setDialog('menu')}
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
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// Helpers
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

function MenuItem({
  label,
  hint,
  onClick,
  danger,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
        danger ? 'hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <p className={`text-sm font-medium ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
        {label}
      </p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
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