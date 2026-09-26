import { redirect } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { ToastContainer } from 'react-toastify';
import Sidebar from '../Sidebar';
import { getSession } from '@/lib/session';
import DashboardClientLayout from '../DashboardClientLayout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) redirect('/sign-in');

  // Guard against deactivated / deleted users
  const user = session as {
    id: string;
    email: string;
    name: string;
    role: string;
    status?: string;
    deactivatedAt?: string | null;
    deletedAt?: string | null;
  };

  if (user.deletedAt || user.deactivatedAt || user.status === 'INACTIVE' || user.status === 'TERMINATED') {
    redirect('/sign-in');
  }
  console.log(user);

  return (
    <DashboardClientLayout user={user}>
      {children}
    </DashboardClientLayout>
    // <div className="flex relative min-h-[calc(100vh-4rem)] bg-red-950 relative">
    //       {/* Sidebar navigation */}
    //       <Sidebar user={user} />
    //       <ToastContainer
    //         position="top-right"
    //         autoClose={3000}
    //         hideProgressBar={false}
    //         newestOnTop
    //         closeOnClick
    //         pauseOnHover
    //         draggable
    //         theme="colored"
    //       />
    //       {/* Main page content area */}
    //       <main className="flex-1 overflow-y-auto p-2 sm:p-8">
    //         {children}
    //       </main>
    //     </div>
  );
}