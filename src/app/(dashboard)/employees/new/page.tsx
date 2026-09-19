import { redirect } from 'next/navigation';
import Link from 'next/link';
import EmployeeForm from '../_components/EmployeeForm';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function NewEmployeePage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as string;
  if (role !== 'ADMIN' && role !== 'HR_MANAGER') redirect('/employees');

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <nav className="text-xs text-slate-500 dark:text-slate-400">
        <Link href="/employees" className="hover:text-slate-900 dark:hover:text-slate-200">
          Employees
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-900 dark:text-slate-200">New</span>
      </nav>

      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Add employee
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create a new employee account.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900">
        <EmployeeForm mode="create" departments={departments} canChangeRole />
      </div>
    </div>
  );
}