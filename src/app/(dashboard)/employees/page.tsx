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

  const fetchUsers = async () => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      console.log(users);
      return users;
    } catch (err) {
      throw err;
    }

  }

  const users = await fetchUsers();



  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Employees
          </h1>
          {/* <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total || 1} {total === 1 ? 'employee' : 'employees'} in the organization.
          </p> */}
        </div>
        <div className="flex gap-3">
          <Link href="/settings/profile" className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 ">
            View self</Link>
          <Link
            href="/employees/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 "
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add employee
          </Link>
        </div>
      </header>

      <EmployeesClient
        users={users}
      // departments={departments}
      // filters={{ q, role: roleFilter, dept: deptFilter, status: statusFilter }}
      // pagination={{ page, totalPages, total }}
      />
    </div>
  );
}