import { getSession } from "@/lib/session";
import Link from "next/link";

export default async function Home() {
  const user = await getSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {user?.id ? (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="space-y-2">
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                Active Session
              </span>
              <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}!</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                You are signed in and ready to go. Jump right into your workspace.
              </p>
            </div>
            
            <Link
              href="/dashboard"
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-center font-medium text-white shadow-md transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Head to dashboard
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Get Started</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                You need to log in or create an account to access the dashboard.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <Link
                href="/sign-in"
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-center font-medium text-white shadow-md transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-3 text-center font-medium text-zinc-900 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}