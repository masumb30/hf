import { prisma, type Prisma } from '@/lib/prisma';

type Tx = Prisma.TransactionClient | typeof prisma;

export async function writeAudit(
  tx: Tx,
  data: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return tx.auditLog.create({
    data: {
      actorId: data.actorId ?? undefined,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ?? undefined,
      metadata: data.metadata,
    },
  });
}

export async function notifyUsers(
  tx: Tx,
  userIds: string[],
  type: string,
  payload: Prisma.InputJsonValue
) {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;
  await tx.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type,
      payload,
    })),
  });
}
