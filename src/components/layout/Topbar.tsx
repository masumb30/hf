'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface TopbarProps {
  user: { id: string; email: string; name: string; role: string };
}

export default function Topbar({ user }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const res = await fetch('/api/auth/sign-out', { method: 'POST' });
      if (!res.ok) throw new Error('Sign out failed');
      toast.success('Signed out');
      router.push('/sign-in');
      router.refresh();
    } catch {
      toast.error('Could not sign out. Try again.');
    } finally {
      setSigningOut(false);
    }
  }

  const roleLabel =
    user.role === 'ADMIN' ? 'Admin' : user.role === 'HR_MANAGER' ? 'HR Manager' : 'Employee';

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            HF
          </div>
          <span className="hidden md:inline text-sm font-semibold text-slate-900 dark:text-slate-100">
            HRFlow
          </span>
        </Link>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {roleLabel}
              </p>
            </div>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {user.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
              <div className="p-1">
                <Link
                  href="/settings/profile"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Profile
                </Link>
                <Link
                  href="/settings/password"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Password
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}