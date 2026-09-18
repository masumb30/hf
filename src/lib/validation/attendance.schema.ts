import { z } from 'zod';
import { objectIdSchema } from './common';

export const attendanceListQuerySchema = z.object({
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  userId: objectIdSchema.optional(),
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
});
