import { NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/utils/apiWrapper';

export const GET = withAuth(async (req: Request, context, user: AuthUser) => {
  // If the request reaches here, the user is guaranteed to be authenticated and fetched from Prisma
  return NextResponse.json({
    success: true,
    message: 'User profile fetched successfully',
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});