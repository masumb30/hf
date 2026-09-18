'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface Props {
  users: { id: string; name: string; email: string; role: string }[];
  departments: { id: string; name: string; parentId: string | null }[];
  headedDepartments: { id: string; name: string }[];
  canCreateOrgConversations: boolean;
  onClose: () => void;
}

type Tab = 'direct' | 'to-department' | 'dept-to-dept' | 'dept-to-employee';

export default function NewConversationDialog({
  users,
  departments,
  headedDepartments,
  canCreateOrgConversations,
  onClose,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('direct');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Direct
  const [directUserId, setDirectUserId] = useState('');

  // Employee → department
  const [toDeptId, setToDeptId] = useState('');

  // Department → department (from + to)
  const [fromDeptId, setFromDeptId] = useState(headedDepartments[0]?.id ?? '');
  const [toDeptDeptId, setToDeptDeptId] = useState('');

  // Department → employee
  const [deptToEmpFrom, setDeptToEmpFrom] = useState(headedDepartments[0]?.id ?? '');
  const [deptToEmpTarget, setDeptToEmpTarget] = useState('');

  const availableTabs: { key: Tab; label: string }[] = useMemo(() => {
    const tabs: { key: Tab; label: string }[] = [
      { key: 'direct', label: 'Direct' },
      { key: 'to-department', label: 'To a department' },
    ];
    if (canCreateOrgConversations && headedDepartments.length > 0) {
      tabs.push({ key: 'dept-to-dept', label: 'Dept → Dept' });
      tabs.push({ key: 'dept-to-employee', label: 'Dept → Employee' });
    }
    return tabs;
  }, [canCreateOrgConversations, headedDepartments.length]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (tab === 'direct' && !directUserId) e.directUserId = 'Select an employee.';
    if (tab === 'to-department' && !toDeptId) e.toDeptId = 'Select a department.';
    if (tab === 'dept-to-dept') {
      if (!fromDeptId) e.fromDeptId = 'Select your department.';
      if (!toDeptDeptId) e.toDeptDeptId = 'Select the target department.';
      if (fromDeptId === toDeptDeptId) e.toDeptDeptId = 'Sender and target cannot be the same.';
    }
    if (tab === 'dept-to-employee') {
      if (!deptToEmpFrom) e.deptToEmpFrom = 'Select your department.';
      if (!deptToEmpTarget) e.deptToEmpTarget = 'Select the employee.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      let body: Record<string, unknown> = {};
      if (tab === 'direct') {
        body = { type: 'DIRECT', participantUserId: directUserId };
      } else if (tab === 'to-department') {
        body = { type: 'EMPLOYEE_TO_DEPT', toDepartmentId: toDeptId };
      } else if (tab === 'dept-to-dept') {
        body = {
          type: 'DEPT_TO_DEPT',
          fromDepartmentId: fromDeptId,
          toDepartmentId: toDeptDeptId,
        };
      } else if (tab === 'dept-to-employee') {
        body = {
          type: 'DEPT_TO_EMPLOYEE',
          fromDepartmentId: deptToEmpFrom,
          toUserId: deptToEmpTarget,
        };
      }

      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Could not create conversation');
      }

      const data = await res.json().catch(() => ({}));
      toast.success('Conversation started');
      onClose();

      if (data?.id) {
        router.push(`/messages/${data.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={() => !submitting && onClose()} title="New conversation">
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/60">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-center text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === 'direct' && (
          <Field label="Employee" error={errors.directUserId} required>
            <select
              value={directUserId}
              onChange={(e) => { setDirectUserId(e.target.value); if (errors.directUserId) setErrors((x) => ({ ...x, directUserId: '' })); }}
              disabled={submitting}
              className={inputClass(errors.directUserId)}
            >
              <option value="">— Select an employee —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Direct messages are private between you and the recipient.
            </p>
          </Field>
        )}

        {tab === 'to-department' && (
          <Field label="Department" error={errors.toDeptId} required>
            <select
              value={toDeptId}
              onChange={(e) => { setToDeptId(e.target.value); if (errors.toDeptId) setErrors((x) => ({ ...x, toDeptId: '' })); }}
              disabled={submitting}
              className={inputClass(errors.toDeptId)}
            >
              <option value="">— Select a department —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Members of the department can see this conversation.
            </p>
          </Field>
        )}

        {tab === 'dept-to-dept' && (
          <>
            <Field label="From (your department)" error={errors.fromDeptId} required>
              <select
                value={fromDeptId}
                onChange={(e) => setFromDeptId(e.target.value)}
                disabled={submitting}
                className={inputClass(errors.fromDeptId)}
              >
                <option value="">— Select —</option>
                {headedDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="To (target department)" error={errors.toDeptDeptId} required>
              <select
                value={toDeptDeptId}
                onChange={(e) => { setToDeptDeptId(e.target.value); if (errors.toDeptDeptId) setErrors((x) => ({ ...x, toDeptDeptId: '' })); }}
                disabled={submitting}
                className={inputClass(errors.toDeptDeptId)}
              >
                <option value="">— Select —</option>
                {departments
                  .filter((d) => d.id !== fromDeptId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            </Field>
          </>
        )}

        {tab === 'dept-to-employee' && (
          <>
            <Field label="From (your department)" error={errors.deptToEmpFrom} required>
              <select
                value={deptToEmpFrom}
                onChange={(e) => setDeptToEmpFrom(e.target.value)}
                disabled={submitting}
                className={inputClass(errors.deptToEmpFrom)}
              >
                <option value="">— Select —</option>
                {headedDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="To (employee)" error={errors.deptToEmpTarget} required>
              <select
                value={deptToEmpTarget}
                onChange={(e) => { setDeptToEmpTarget(e.target.value); if (errors.deptToEmpTarget) setErrors((x) => ({ ...x, deptToEmpTarget: '' })); }}
                disabled={submitting}
                className={inputClass(errors.deptToEmpTarget)}
              >
                <option value="">— Select —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Starting…' : 'Start conversation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">{error}</span>}
    </label>
  );
}

function inputClass(error?: string) {
  const base =
    'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 disabled:opacity-60 dark:bg-slate-950 dark:text-slate-100';
  return error
    ? `${base} border-rose-300 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-900`
    : `${base} border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-800`;
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
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
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