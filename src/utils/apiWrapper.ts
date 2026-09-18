import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';
  name: string;
  departmentId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

export type RouteContext = {
  params?: Promise<Record<string, string>>;
};

export type AuthenticatedHandler = (
  req: Request,
  context: RouteContext,
  user: AuthUser
) => Promise<NextResponse> | NextResponse;

export type Role = AuthUser['role'];

export function hasRequiredRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

export function withAuth(
  handler: AuthenticatedHandler,
  allowedRoles?: Role[]
) {
  return async (req: Request, context: RouteContext) => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;

      if (!token) {
        return errorResponse('Unauthorized: No token provided', 401);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          departmentId: true,
          status: true,
          deactivatedAt: true,
          deletedAt: true,
        },
      });

      if (!user || user.deletedAt) {
        return errorResponse('Unauthorized: User not found', 401);
      }

      if (user.deactivatedAt || user.status !== 'ACTIVE') {
        return errorResponse('Forbidden: Account is not active', 403);
      }

      if (allowedRoles && allowedRoles.length > 0) {
        if (!hasRequiredRole(user.role, allowedRoles)) {
          return errorResponse('Forbidden: Insufficient permissions', 403);
        }
      }

      return await handler(req, context, {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        departmentId: user.departmentId,
        status: user.status,
      });
    } catch (error: unknown) {
      console.error('API Error:', error);
      const name = typeof error === 'object' && error && 'name' in error
        ? String((error as { name: string }).name)
        : '';

      if (name === 'JsonWebTokenError' || name === 'TokenExpiredError') {
        return errorResponse('Invalid or expired token', 401);
      }

      return errorResponse('Internal Server Error', 500);
    }
  };
}

export async function readBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function paramId(
  context: RouteContext,
  key = 'id'
): Promise<string | undefined> {
  const params = context.params ? await context.params : undefined;
  return params?.[key];
}
