'use client';

import Link from 'next/link';
import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  role: string;
  status: string;
  dateJoined: Date;
  profileImage: string | null;
  department: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Props {
  users: UserRow[];
  departments: Department[];
  filters: { q: string; role: string; dept: string; status: string };
  pagination: { page: number; totalPages: number; total: number };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    INACTIVE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    TERMINATED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map.INACTIVE}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    ADMIN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    HR_MANAGER: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    EMPLOYEE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  const label = role === 'HR_MANAGER' ? 'HR Manager' : role.charAt(0) + role.slice(1).toLowerCase();
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[role] ?? map.EMPLOYEE}`}>
      {label}
    </span>
  );
}

export default function EmployeesClient({ users, departments, filters, pagination }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(filters.q);
  const [role, setRole] = useState(filters.role);
  const [dept, setDept] = useState(filters.dept);
  const [status, setStatus] = useState(filters.status);

  // Debounced search input
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== filters.q) applyFilters({ q });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function applyFilters(overrides: Partial<{ q: string; role: string; dept: string; status: string; page: string }>) {
    const next = new URLSearchParams(searchParams.toString());
    const merged = {
      q,
      role,
      dept,
      status,
      page: '1',
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) next.set(k, String(v));
      else next.delete(k);
    });
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function changeRole(v: string) { setRole(v); applyFilters({ role: v }); }
  function changeDept(v: string) { setDept(v); applyFilters({ dept: v }); }
  function changeStatus(v: string) { setStatus(v); applyFilters({ status: v }); }

  function clearAll() {
    setQ(''); setRole(''); setDept(''); setStatus('');
    startTransition(() => router.push(pathname));
  }

  const hasFilters = !!(filters.q || filters.role || filters.dept || filters.status);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, or position…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <select
            value={role}
            onChange={(e) => changeRole(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="HR_MANAGER">HR Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>

          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <select
            value={dept}
            onChange={(e) => changeDept(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900 ${isPending ? 'opacity-60' : ''}`}>
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {hasFilters ? 'No employees match your filters' : 'No employees yet'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {hasFilters ? 'Try adjusting or clearing filters.' : 'Add your first employee to get started.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-950/50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => {
                    const initials = u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {u.profileImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.profileImage} alt={u.name} className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {u.department?.name ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {u.position ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
                        </td>
                        <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/employees/${u.id}`}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {users.map((u) => {
                const initials = u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <Link
                    key={u.id}
                    href={`/employees/${u.id}`}
                    className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={u.role} />
                        <StatusBadge status={u.status} />
                        {u.department && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {u.department.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => applyFilters({ page: String(pagination.page - 1) })}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => applyFilters({ page: String(pagination.page + 1) })}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}