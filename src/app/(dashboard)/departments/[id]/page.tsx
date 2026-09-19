import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import DepartmentDetailClient from './_components/DepartmentDetailClient';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DepartmentDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as string;
  const canManage = role === 'ADMIN' || role === 'HR_MANAGER';

  const { id } = await params;

  const department = await prisma.department.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      parentId: true,
      headId: true,
      path: true,
      head: { select: { id: true, name: true, email: true, profileImage: true } },
      parent: { select: { id: true, name: true } },
      children: {
        select: {
          id: true,
          name: true,
          _count: { select: { employees: true } },
        },
        orderBy: { name: 'asc' },
      },
      employees: {
        select: {
          id: true,
          name: true,
          email: true,
          position: true,
          role: true,
          status: true,
          profileImage: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!department) notFound();

  // Ancestors: walk parentId chain
  const allDepts = await prisma.department.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const byId = new Map(allDepts.map((d) => [d.id, d]));
  const ancestors: { id: string; name: string }[] = [];
  let cursor = department.parentId;
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor)) {
    guard.add(cursor);
    const node = byId.get(cursor);
    if (!node) break;
    ancestors.unshift({ id: node.id, name: node.name });
    cursor = node.parentId;
  }

  const headCandidates = canManage
    ? await prisma.user.findMany({
        where: { deletedAt: null, deactivatedAt: null, status: 'ACTIVE' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
    : [];

  // For move dialog: pass flat list (excluding self + descendants is done client-side)
  const flatForMove = canManage
    ? await prisma.department.findMany({
        select: { id: true, name: true, parentId: true, path: true },
        orderBy: { name: 'asc' },
      })
    : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <nav className="text-xs text-slate-500 dark:text-slate-400">
        <Link href="/departments" className="hover:text-slate-900 dark:hover:text-slate-200">
          Departments
        </Link>
        {ancestors.map((a) => (
          <span key={a.id}>
            <span className="mx-1.5">/</span>
            <Link href={`/departments/${a.id}`} className="hover:text-slate-900 dark:hover:text-slate-200">
              {a.name}
            </Link>
          </span>
        ))}
        <span className="mx-1.5">/</span>
        <span className="text-slate-900 dark:text-slate-200">{department.name}</span>
      </nav>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {department.name}
          </h1>
          {department.description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {department.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {department.employees.length} {department.employees.length === 1 ? 'member' : 'members'}
            </span>
            {department.children.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {department.children.length} {department.children.length === 1 ? 'sub-department' : 'sub-departments'}
              </span>
            )}
            {department.head && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                Head: {department.head.name}
              </span>
            )}
          </div>
        </div>

        {canManage && (
          <DepartmentDetailClient
            department={{
              id: department.id,
              name: department.name,
              description: department.description,
              parentId: department.parentId,
              headId: department.headId,
              head: department.head,
            }}
            flat={flatForMove}
            users={headCandidates}
          />
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sub-departments */}
        <section className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Sub-departments
          </h2>
          {department.children.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
              No sub-departments.
            </p>
          ) : (
            <ul className="space-y-1">
              {department.children.map((c:any) => (
                <li key={c.id}>
                  <Link
                    href={`/departments/${c.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span className="truncate text-slate-900 dark:text-slate-100">{c.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {c._count.employees}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Members */}
        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Members
          </h2>
          {department.employees.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
              No employees assigned to this department yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {department.employees.map((e:any) => {
                const initials = e.name.split(' ').map((n:any) => n[0]).slice(0, 2).join('').toUpperCase();
                const roleLabel =
                  e.role === 'HR_MANAGER' ? 'HR Manager' :
                  e.role.charAt(0) + e.role.slice(1).toLowerCase();
                return (
                  <li key={e.id}>
                    <Link
                      href={`/employees/${e.id}`}
                      className="flex items-center gap-3 py-3 hover:opacity-90"
                    >
                      {e.profileImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.profileImage} alt={e.name} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {e.name}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {e.position ?? e.email}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {roleLabel}
                      </span>
                  </Link>
                </li>
              );
            })}
          
        </ul>
          )}
        </section>
      </div>
    </div>
    
  );
}