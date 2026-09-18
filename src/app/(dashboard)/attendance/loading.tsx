export default function AttendanceLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}