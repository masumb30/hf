export default function EmployeesLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
    </div>
  );
}