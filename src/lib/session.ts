import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import jwt  from 'jsonwebtoken';

const SESSION_COOKIE = 'token';
const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

export interface Session {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';
}

export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const  payload  =  jwt.verify(token, process.env.JWT_SECRET as string);
    return payload as Session;
  } catch {
    return null; // invalid signature, expired, malformed — treat as no session
  }
});