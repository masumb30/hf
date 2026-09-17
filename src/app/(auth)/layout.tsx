export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-6 flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
          <span className="text-sm font-semibold tracking-wider text-slate-300 uppercase">Enterprise OS</span>
        </div>
        {children}
      </div>
    </div>
  );
}