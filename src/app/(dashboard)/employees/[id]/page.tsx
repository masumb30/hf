import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import EmployeeForm from '../_components/EmployeeForm';
import EmployeeProfileActions from './_components/EmployeeProfileActions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    INACTIVE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    TERMINATED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? map.INACTIVE}`}>
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
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[role] ?? map.EMPLOYEE}`}>
      {label}
    </span>
  );
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as string;
  if (role !== 'ADMIN' && role !== 'HR_MANAGER') redirect('/employees');

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      position: true,
      role: true,
      status: true,
      dateJoined: true,
      profileImage: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      headedDepartments: { select: { id: true, name: true } },
      createdAt: true,
      deactivatedAt: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) notFound();

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const initials = user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const canChangeRole = role === 'ADMIN';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <nav className="text-xs text-slate-500 dark:text-slate-400">
        <Link href="/employees" className="hover:text-slate-900 dark:hover:text-slate-200">
          Employees
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-900 dark:text-slate-200">{user.name}</span>
      </nav>

      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {user.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profileImage} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {user.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
                {user.department && (
                  <Link
                    href={`/departments/${user.department.id}`}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {user.department.name}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <EmployeeProfileActions
            user={{
              id: user.id,
              name: user.name,
              role: user.role,
              status: user.status,
              departmentId: user.departmentId,
            }}
            departments={departments}
            canChangeRole={canChangeRole}
            isSelf={session.id === user.id}
          />
        </div>

        {/* Meta grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 md:grid-cols-4 dark:border-slate-800">
          <Meta label="Position" value={user.position ?? '—'} />
          <Meta label="Phone" value={user.phone ?? '—'} />
          <Meta label="Date joined" value={formatDate(user.dateJoined)} />
          <Meta
            label="Heads departments"
            value={
              user.headedDepartments.length === 0
                ? '—'
                : user.headedDepartments.map((d) => d.name).join(', ')
            }
          />
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Edit details
        </h2>
        <EmployeeForm
          mode="edit"
          departments={departments}
          canChangeRole={canChangeRole}
          initial={{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            position: user.position,
            role: user.role,
            status: user.status,
            departmentId: user.departmentId,
          }}
        />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}