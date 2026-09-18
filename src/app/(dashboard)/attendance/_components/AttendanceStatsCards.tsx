interface Stats {
  presentToday: number;
  absentToday: number;
  notClockedOut: number;
  totalEmployees: number;
}

export default function AttendanceStatsCards({ stats }: { stats: Stats }) {
  const cards = [
    {
      label: 'Present today',
      value: stats.presentToday,
      accent: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      label: 'Absent today',
      value: stats.absentToday,
      accent: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      label: 'Not clocked out',
      value: stats.notClockedOut,
      accent: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      label: 'Total employees',
      value: stats.totalEmployees,
      accent: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${c.accent}`}>
            {c.label}
          </span>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}