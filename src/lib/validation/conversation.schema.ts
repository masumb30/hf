import { z } from 'zod';
import { objectIdSchema } from './common';

export const createConversationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('DIRECT'),
    recipientId: objectIdSchema,
  }),
  z.object({
    type: z.literal('EMPLOYEE_TO_DEPT'),
    departmentId: objectIdSchema,
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('DEPT_TO_DEPT'),
    senderDepartmentId: objectIdSchema,
    recipientDepartmentId: objectIdSchema,
    title: z.string().min(1),
  }),
  z.object({
    type: z.literal('DEPT_TO_EMPLOYEE'),
    senderDepartmentId: objectIdSchema,
    recipientUserId: objectIdSchema,
    title: z.string().min(1),
  }),
]);

export const addParticipantSchema = z
  .object({
    userId: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional(),
  })
  .refine((v) => Boolean(v.userId) !== Boolean(v.departmentId), {
    message: 'Exactly one of userId or departmentId is required',
  });
