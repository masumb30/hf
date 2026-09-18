import { redirect } from 'next/navigation';

import DepartmentTree from './_components/DepartmentTree';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function DepartmentsPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as string;
  const canManage = role === 'ADMIN' || role === 'HR_MANAGER';

  const [departments, users] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        headId: true,
        path: true,
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { employees: true, children: true } },
      },
    }),
    // Active users for "assign head" and "assign employee" pickers
    canManage
      ? prisma.user.findMany({
          where: { deletedAt: null, deactivatedAt: null, status: 'ACTIVE' },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  // Build tree on the server (cheap, avoids client work)
  type DeptNode = (typeof departments)[number] & { children: DeptNode[] };
  const map = new Map<string, DeptNode>();
  departments.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: DeptNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Departments
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {departments.length} {departments.length === 1 ? 'department' : 'departments'} in the organization.
          </p>
        </div>
      </header>

      <DepartmentTree
        tree={roots}
        flat={departments}
        users={users}
        canManage={canManage}
      />
    </div>
  );
}