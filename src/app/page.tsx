import { getSession } from "@/lib/session";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const user = await getSession();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {
        user?.id ? (
          <div>
            <h1 className="text-4xl font-bold">Welcome back, {user.name}!</h1>
            <Link className="p-3 bg-green-950 rounded-md" href="/dashboard">Head to dashboard</Link>
          </div>
        ) :
          <>
            <h1>You need to log in or sign up to head to dashboard</h1>
            <Link href="/sign-in">
              <button className="p-3 bg-green-300 rounded-md">Sign in</button>
            </Link>
            <Link href="/sign-up">
              <button className="p-3 bg-green-300 rounded-md">Sign up</button>
              </Link>
            </>
        
      }
          </div>
      );
}
