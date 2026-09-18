'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface Department {
  id: string;
  name: string;
}

interface Props {
  mode: 'create' | 'edit';
  departments: Department[];
  initial?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    position: string | null;
    role: string;
    status: string;
    departmentId: string | null;
  };
  canChangeRole: boolean;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  position: string;
  password: string;
  role: string;
  departmentId: string;
}

export default function EmployeeForm({ mode, departments, initial, canChangeRole }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    position: initial?.position ?? '',
    password: '',
    role: initial?.role ?? 'EMPLOYEE',
    departmentId: initial?.departmentId ?? '',
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (mode === 'create') {
      if (!form.email.trim()) e.email = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email.';
      if (!form.password) e.password = 'Password is required.';
      else if (form.password.length < 8) e.password = 'At least 8 characters.';
    }
    if (form.phone && !/^[+\d][\d\s\-()]{5,}$/.test(form.phone)) {
      e.phone = 'Invalid phone number.';
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
      const url = isEdit ? `/api/users/${initial!.id}` : '/api/users';
      const method = isEdit ? 'PATCH' : 'POST';

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        position: form.position.trim() || null,
        departmentId: form.departmentId || null,
      };

      if (!isEdit) {
        body.email = form.email.trim().toLowerCase();
        body.password = form.password;
        body.role = form.role;
      } else if (canChangeRole) {
        // Note: role change for edit goes through /api/users/[id]/role,
        // not this form. Kept here for completeness if the admin edited it inline.
        body.role = form.role;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Request failed');
      }

      toast.success(isEdit ? 'Employee updated' : 'Employee created');
      router.refresh();

      if (!isEdit) {
        const data = await res.json().catch(() => ({}));
        if (data?.id) router.push(`/employees/${data.id}`);
        else router.push('/employees');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const isEdit = mode === 'edit';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Full name" error={errors.name} required>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            disabled={submitting}
            className={inputClass(errors.name)}
            placeholder="Jane Doe"
          />
        </Field>

        <Field label="Email" error={errors.email} required={!isEdit}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            disabled={submitting || isEdit}
            className={inputClass(errors.email)}
            placeholder="jane@company.com"
          />
          {isEdit && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Email cannot be changed after creation.
            </p>
          )}
        </Field>

        <Field label="Phone" error={errors.phone}>
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            disabled={submitting}
            className={inputClass(errors.phone)}
            placeholder="+1 555 0100"
          />
        </Field>

        <Field label="Position">
          <input
            value={form.position}
            onChange={(e) => set('position', e.target.value)}
            disabled={submitting}
            className={inputClass()}
            placeholder="Software Engineer"
          />
        </Field>

        <Field label="Department">
          <select
            value={form.departmentId}
            onChange={(e) => set('departmentId', e.target.value)}
            disabled={submitting}
            className={inputClass()}
          >
            <option value="">Unassigned</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>

        {!isEdit && (
          <Field label="Role" required>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              disabled={submitting}
              className={inputClass()}
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="HR_MANAGER">HR Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>
        )}

        {!isEdit && (
          <Field label="Password" error={errors.password} required>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              disabled={submitting}
              className={inputClass(errors.password)}
              placeholder="At least 8 characters"
            />
          </Field>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
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
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
        </button>
      </div>
    </form>
  );
}

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