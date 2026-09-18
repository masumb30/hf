import { redirect } from 'next/navigation';
import PasswordForm from './_components/PasswordForm';
import { getSession } from '@/lib/session';

export default async function PasswordSettingsPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Password settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Change your account password.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900">
        <PasswordForm />
      </div>
    </div>
  );
}