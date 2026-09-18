export default function MessagesLoading() {
  return (
    <div className="p-4 md:p-6">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 mb-4" />
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-800"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}