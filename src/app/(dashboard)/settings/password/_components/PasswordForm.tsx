'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!currentPassword) e.currentPassword = 'Current password is required.';
    if (!newPassword) e.newPassword = 'New password is required.';
    else if (newPassword.length < 8) e.newPassword = 'At least 8 characters.';
    else if (newPassword === currentPassword) e.newPassword = 'New password must be different.';
    if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Could not change password');
      }

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <Field label="Current password" error={errors.currentPassword} required>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); if (errors.currentPassword) setErrors((x) => ({ ...x, currentPassword: '' })); }}
            disabled={saving}
            autoComplete="current-password"
            className={inputClass(errors.currentPassword)}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label={showCurrent ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            <EyeIcon open={showCurrent} />
          </button>
        </div>
      </Field>

      <Field label="New password" error={errors.newPassword} required>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); if (errors.newPassword) setErrors((x) => ({ ...x, newPassword: '' })); }}
            disabled={saving}
            autoComplete="new-password"
            className={inputClass(errors.newPassword)}
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label={showNew ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            <EyeIcon open={showNew} />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Minimum 8 characters.
        </p>
      </Field>

      <Field label="Confirm new password" error={errors.confirmPassword} required>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((x) => ({ ...x, confirmPassword: '' })); }}
          disabled={saving}
          autoComplete="new-password"
          className={inputClass(errors.confirmPassword)}
        />
      </Field>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      {open ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </>
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </>
      )}
    </svg>
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
    'w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 disabled:opacity-60 dark:bg-slate-950 dark:text-slate-100';
  return error
    ? `${base} border-rose-300 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-900`
    : `${base} border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-800`;
}