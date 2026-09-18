import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withAuth } from '@/utils/apiWrapper';

export const POST = withAuth(async () => {
  const cookieStore = await cookies();
  cookieStore.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return NextResponse.json({
    success: true,
    message: 'Signed out successfully',
    data: null,
  });
});
