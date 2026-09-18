import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';


export default async function OrgSettingsPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as string;
  if (role !== 'ADMIN') redirect('/settings/profile');

  const [totalUsers, totalDepts, activeUsers] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.department.count(),
    prisma.user.count({ where: { deletedAt: null, deactivatedAt: null, status: 'ACTIVE' } }),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Organization settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Organization-wide configuration and overview.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Total users" value={totalUsers} />
        <Card label="Active users" value={activeUsers} />
        <Card label="Departments" value={totalDepts} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Coming soon
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Organization branding, default timezone, leave policies, and audit retention
          settings are planned for a future release.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            Organization name and logo
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            Default timezone and date format
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            Leave policy configuration
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            Audit log retention window
          </li>
        </ul>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}