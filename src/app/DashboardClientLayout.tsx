// app/dashboard/DashboardClientLayout.tsx
'use client';

import { useState, useEffect, ReactNode } from 'react';
import { ToastContainer } from 'react-toastify';
import Sidebar from './Sidebar'; // Adjust path as needed

interface DashboardClientLayoutProps {
  user: any; // Type this with your user type definition
  children: ReactNode;
}

export default function DashboardClientLayout({ user, children }: DashboardClientLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const collapsed = isMobile || isCollapsed;

  return (
    <div className="flex relative min-h-[calc(100vh-4rem)] bg-slate-950">
      {/* Sidebar gets the state handlers */}
      <Sidebar 
        user={user} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        collapsed={collapsed} 
      />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />

      {/* Main content dynamically adjusts padding based on 'collapsed' state */}
      <main className={`flex-1 overflow-y-auto  transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {children}
      </main>
    </div>
  );
}