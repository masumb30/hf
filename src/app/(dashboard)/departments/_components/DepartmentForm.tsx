'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface FlatDept {
  id: string;
  name: string;
  parentId: string | null;
}

interface Props {
  mode: 'create' | 'edit';
  flat: FlatDept[];
  initialParentId?: string | null;
  initial?: {
    id: string;
    name: string;
    description: string | null;
    parentId: string | null;
  };
  onClose: () => void;
}

export default function DepartmentForm({ mode, flat, initialParentId, initial, onClose }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [parentId, setParentId] = useState<string>(
    initial?.parentId ?? initialParentId ?? ''
  );

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    else if (name.trim().length < 2) e.name = 'At least 2 characters.';

    // Duplicate name check (case-insensitive)
    const dup = flat.find(
      (d) => d.id !== initial?.id && d.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (dup) e.name = 'A department with this name already exists.';

    // Self-parent prevention on edit
    if (mode === 'edit' && initial && parentId === initial.id) {
      e.parentId = 'A department cannot be its own parent.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const isEdit = mode === 'edit';
      const url = isEdit ? `/api/departments/${initial!.id}` : '/api/departments';
      const method = isEdit ? 'PATCH' : 'POST';

      // On create, parentId is set at creation.
      // On edit, parentId is NOT changed here (move is a separate action).
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
      };
      if (!isEdit) body.parentId = parentId || null;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Request failed');
      }

      toast.success(isEdit ? 'Department updated' : 'Department created');
      router.refresh();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const isEdit = mode === 'edit';

  return (
    <Modal onClose={onClose} title={isEdit ? 'Edit department' : 'New department'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" error={errors.name} required>
          <input
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((x) => ({ ...x, name: '' })); }}
            disabled={submitting}
            className={inputClass(errors.name)}
            placeholder="Engineering"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={3}
            className={inputClass()}
            placeholder="What this department does…"
          />
        </Field>

        {!isEdit && (
          <Field label="Parent department" error={errors.parentId}>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={submitting}
              className={inputClass()}
            >
              <option value="">None (top-level)</option>
              {flat.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Parent can be changed later via &quot;Move&quot;.
            </p>
          </Field>
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
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Shared bits (duplicated per batch on purpose — you'll modularize later)
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