import { redirect } from 'next/navigation';
import Link from 'next/link';
import EmployeesClient from './_components/EmployeesClient';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
    dept?: string;
    status?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function EmployeesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';

  // Only ADMIN and HR can access this page.
  if (role !== 'ADMIN' && role !== 'HR_MANAGER') {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const roleFilter = params.role ?? '';
  const deptFilter = params.dept ?? '';
  const statusFilter = params.status ?? '';
  const page = Math.max(parseInt(params.page ?? '1', 10) || 1, 1);
  const skip = (page - 1) * PAGE_SIZE;

  // Build where clause
  const where: Record<string, unknown> = { deletedAt: null };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { position: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (roleFilter === 'ADMIN' || roleFilter === 'HR_MANAGER' || roleFilter === 'EMPLOYEE') {
    where.role = roleFilter;
  }
  if (statusFilter === 'ACTIVE' || statusFilter === 'INACTIVE' || statusFilter === 'TERMINATED') {
    where.status = statusFilter;
  }
  if (deptFilter) {
    where.departmentId = deptFilter;
  }

  const [users, total, departments] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
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
        department: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Employees
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} {total === 1 ? 'employee' : 'employees'} in the organization.
          </p>
        </div>
        <Link
          href="/employees/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add employee
        </Link>
      </header>

      <EmployeesClient
        users={users}
        departments={departments}
        filters={{ q, role: roleFilter, dept: deptFilter, status: statusFilter }}
        pagination={{ page, totalPages, total }}
      />
    </div>
  );
}