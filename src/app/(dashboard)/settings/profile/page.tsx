import { redirect } from 'next/navigation';

import ProfileForm from './_components/ProfileForm';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function ProfileSettingsPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      position: true,
      profileImage: true,
      role: true,
      department: { select: { id: true, name: true } },
      dateJoined: true,
    },
  });

  if (!user) redirect('/sign-in');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Profile settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your personal information and profile picture.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900">
        <ProfileForm
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            position: user.position,
            profileImage: user.profileImage,
            role: user.role,
            department: user.department,
            dateJoined: user.dateJoined.toISOString(),
          }}
        />
      </div>
    </div>
  );
}