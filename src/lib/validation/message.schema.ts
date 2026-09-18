import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1).optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1),
});
