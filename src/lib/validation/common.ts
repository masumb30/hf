import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export function parseJson<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid input';
    return { success: false as const, message };
  }
  return { success: true as const, data: result.data };
}

export function parseSearchParams<T>(
  schema: z.ZodType<T>,
  searchParams: URLSearchParams
) {
  const raw = Object.fromEntries(searchParams.entries());
  return parseJson(schema, raw);
}
