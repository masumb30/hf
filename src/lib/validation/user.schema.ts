import { z } from 'zod';
import { objectIdSchema } from './common';

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  position: z.string().optional(),
  role: z.enum(['ADMIN', 'HR_MANAGER', 'EMPLOYEE']).optional(),
  departmentId: objectIdSchema.optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'HR_MANAGER', 'EMPLOYEE']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
  departmentId: objectIdSchema.nullable().optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'HR_MANAGER', 'EMPLOYEE']),
});

export const assignDepartmentSchema = z.object({
  departmentId: objectIdSchema,
});

export const userListQuerySchema = z.object({
  q: z.string().optional(),
  role: z.enum(['ADMIN', 'HR_MANAGER', 'EMPLOYEE']).optional(),
  dept: objectIdSchema.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
});
