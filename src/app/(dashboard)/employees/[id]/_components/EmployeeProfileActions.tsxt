'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface Props {
  user: {
    id: string;
    name: string;
    role: string;
    status: string;
    departmentId: string | null;
  };
  departments: { id: string; name: string }[];
  canChangeRole: boolean;
  isSelf: boolean;
}

export default function EmployeeProfileActions({ user, departments, canChangeRole, isSelf }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'deactivate' | 'terminate' | 'reactivate'>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState(user.role);
  const [newDept, setNewDept] = useState(user.departmentId ?? '');

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
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
      return false;
    } finally {
      setPending(null);
    }
  }

  async function handleDeactivate() {
    const ok = await callApi('Deactivate', `/api/users/${user.id}/deactivate`, 'PATCH');
    if (ok) setConfirm(null);
  }

  async function handleReactivate() {
    const ok = await callApi('Reactivate', `/api/users/${user.id}/reactivate`, 'PATCH');
    if (ok) setConfirm(null);
  }

  async function handleTerminate() {
    const ok = await callApi('Terminate', `/api/users/${user.id}/terminate`, 'PATCH');
    if (ok) setConfirm(null);
  }

  async function handleChangeRole() {
    if (newRole === user.role) return setRoleDialogOpen(false);
    const ok = await callApi('Change role', `/api/users/${user.id}/role`, 'PATCH', { role: newRole });
    if (ok) setRoleDialogOpen(false);
  }

  async function handleChangeDept() {
    const currentDept = user.departmentId ?? '';
    if (newDept === currentDept) return setDeptDialogOpen(false);

    const ok = newDept
      ? await callApi('Reassign department', `/api/users/${user.id}/department`, 'PATCH', { departmentId: newDept })
      : await callApi('Remove from department', `/api/users/${user.id}/department`, 'DELETE');
    if (ok) setDeptDialogOpen(false);
  }

  const isActive = user.status === 'ACTIVE';
  const isInactive = user.status === 'INACTIVE';
  const isTerminated = user.status === 'TERMINATED';

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Actions
          <svg className="ml-1.5 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="p-1">
              <button
                onClick={() => { setOpen(false); setDeptDialogOpen(true); }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Change department
              </button>
              {canChangeRole && (
                <button
                  onClick={() => { setOpen(false); setRoleDialogOpen(true); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Change role
                </button>
              )}
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              {isActive && !isSelf && (
                <button
                  onClick={() => { setOpen(false); setConfirm('deactivate'); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                >
                  Deactivate
                </button>
              )}
              {isInactive && (
                <button
                  onClick={() => { setOpen(false); setConfirm('reactivate'); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  Reactivate
                </button>
              )}
              {!isTerminated && !isSelf && (
                <button
                  onClick={() => { setOpen(false); setConfirm('terminate'); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  Terminate
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <Modal onClose={() => setConfirm(null)} title={dialogTitle(confirm)}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {confirm === 'deactivate' && <>Deactivate <strong>{user.name}</strong>? They will lose access but their records will be preserved.</>}
            {confirm === 'reactivate' && <>Reactivate <strong>{user.name}</strong>? They will regain access to the platform.</>}
            {confirm === 'terminate' && <>Terminate <strong>{user.name}</strong>? This is a permanent status change. Records will be preserved.</>}
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setConfirm(null)}
              disabled={!!pending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={
                confirm === 'deactivate' ? handleDeactivate :
                confirm === 'reactivate' ? handleReactivate :
                handleTerminate
              }
              disabled={!!pending}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
                confirm === 'terminate'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : confirm === 'reactivate'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {pending ? 'Working…' : 'Confirm'}
            </button>
          </div>
        </Modal>
      )}

      {/* Change role dialog */}
      {roleDialogOpen && (
        <Modal onClose={() => setRoleDialogOpen(false)} title="Change role">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">New role</span>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="HR_MANAGER">HR Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setRoleDialogOpen(false)}
              disabled={!!pending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleChangeRole}
              disabled={!!pending || newRole === user.role}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save role'}
            </button>
          </div>
        </Modal>
      )}

      {/* Change department dialog */}
      {deptDialogOpen && (
        <Modal onClose={() => setDeptDialogOpen(false)} title="Change department">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Department</span>
            <select
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setDeptDialogOpen(false)}
              disabled={!!pending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleChangeDept}
              disabled={!!pending}
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

function dialogTitle(kind: 'deactivate' | 'reactivate' | 'terminate') {
  if (kind === 'deactivate') return 'Deactivate employee';
  if (kind === 'reactivate') return 'Reactivate employee';
  return 'Terminate employee';
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
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
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