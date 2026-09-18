'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface Props {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    position: string | null;
    profileImage: string | null;
    role: string;
    department: { id: string; name: string } | null;
    dateJoined: string;
  };
}

export default function ProfileForm({ user }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [position, setPosition] = useState(user.position ?? '');
  const [profileImage, setProfileImage] = useState(user.profileImage);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initials = user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const roleLabel =
    user.role === 'HR_MANAGER' ? 'HR Manager' :
    user.role.charAt(0) + user.role.slice(1).toLowerCase();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (phone && !/^[+\d][\d\s\-()]{5,}$/.test(phone)) e.phone = 'Invalid phone number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          position: position.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Could not save profile');
      }

      toast.success('Profile updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/users/${user.id}/profile-image`, {
        method: 'PATCH',
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Upload failed');
      }
      const data = await res.json().catch(() => ({}));
      if (data?.profileImage) setProfileImage(data.profileImage);
      toast.success('Profile image updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar section */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative">
          {profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileImage}
              alt={user.name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-slate-900"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
              {initials}
            </div>
          )}
          {uploadingImage && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/50">
              <svg className="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {roleLabel}
            {user.department && <> · {user.department.name}</>}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {uploadingImage ? 'Uploading…' : 'Change photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="hidden"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            JPG, PNG or WebP · Max 2 MB
          </p>
        </div>
      </div>

      {/* Editable fields */}
      <form onSubmit={handleSave} className="space-y-5 border-t border-slate-100 pt-6 dark:border-slate-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Full name" error={errors.name} required>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((x) => ({ ...x, name: '' })); }}
              disabled={saving}
              className={inputClass(errors.name)}
            />
          </Field>

          <Field label="Email (read-only)">
            <input
              value={user.email}
              readOnly
              className={`${inputClass()} cursor-not-allowed bg-slate-50 dark:bg-slate-900`}
            />
          </Field>

          <Field label="Phone" error={errors.phone}>
            <input
              value={phone}
              onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((x) => ({ ...x, phone: '' })); }}
              disabled={saving}
              className={inputClass(errors.phone)}
              placeholder="+1 555 0100"
            />
          </Field>

          <Field label="Position">
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={saving}
              className={inputClass()}
              placeholder="Software Engineer"
            />
          </Field>

          <Field label="Role (read-only)">
            <input
              value={roleLabel}
              readOnly
              className={`${inputClass()} cursor-not-allowed bg-slate-50 dark:bg-slate-900`}
            />
          </Field>

          <Field label="Department (read-only)">
            <input
              value={user.department?.name ?? 'Unassigned'}
              readOnly
              className={`${inputClass()} cursor-not-allowed bg-slate-50 dark:bg-slate-900`}
            />
          </Field>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
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