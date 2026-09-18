import { prisma, type Prisma } from '@/lib/prisma';

export async function withTx<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(fn);
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code: string }).code)
        : '';
    const message = error instanceof Error ? error.message : '';
    if (code === 'P2031' || message.toLowerCase().includes('replica set')) {
      return fn(prisma as unknown as Prisma.TransactionClient);
    }
    throw error;
  }
}
