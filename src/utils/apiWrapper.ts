// utils/apiWrapper.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';



// 1. Reusable Global Error Response Helper
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

// Type definition for authenticated user
export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// Type for your controller logic
export type AuthenticatedHandler = (
  req: Request,
  context: { params: any },
  user: AuthUser
) => Promise<NextResponse> | NextResponse;

// 2. Centralized Auth & Error Wrapper HOF
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: Request, context: { params: any }) => {
    try {
      // Get cookie using Next.js headers helper
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;

      if (!token) {
        return errorResponse('Unauthorized: No token provided', 401);
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

      // Query Prisma
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        return errorResponse('Unauthorized: User not found', 401);
      }

      // Pass user down to the controller handler
      return await handler(req, context, user);

    } catch (error: any) {
      // Global error handler catch block
      console.error('API Error:', error);

      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return errorResponse('Invalid or expired token', 401);
      }

      // Fallback internal server error
      return errorResponse('Internal Server Error', 500);
    }
  };
}