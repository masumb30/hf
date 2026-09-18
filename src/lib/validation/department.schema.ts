import { z } from 'zod';
import { objectIdSchema } from './common';

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parentId: objectIdSchema.optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export const moveDepartmentSchema = z.object({
  parentId: objectIdSchema.nullable(),
});

export const assignHeadSchema = z.object({
  userId: objectIdSchema,
});
