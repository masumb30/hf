import { cache } from 'react';
import { cookies } from 'next/headers';

// Wrapped in React cache() so it only runs ONCE per request, even if called multiple times
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/me`, {
      headers: { cookie: `token=${token}` },
      cache: 'no-store',
    });

    const json = await res.json();
    if (!res.ok || !json.success) return null;

    return json.data; // { id, email, role }
  } catch {
    return null;
  }
});