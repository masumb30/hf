import { z } from 'zod';

export const submitLeaveSchema = z.object({
  leaveType: z.enum([
    'ANNUAL',
    'SICK',
    'UNPAID',
    'MATERNITY',
    'PATERNITY',
    'COMPASSIONATE',
    'OTHER',
  ]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(1),
});

export const reviewLeaveSchema = z.object({
  reviewNote: z.string().optional(),
});

export const leaveListQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
});
