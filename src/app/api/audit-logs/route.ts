import { prisma, Prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/http/responses';
import { auditLogQuerySchema } from '@/lib/validation/audit.schema';
import { parseSearchParams } from '@/lib/validation/common';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async (req) => {
  const parsed = parseSearchParams(auditLogQuerySchema, new URL(req.url).searchParams);
  if (!parsed.success) return fail(parsed.message);

  const { entityType, entityId, actorId, skip, take } = parsed.data;
  const where: Prisma.AuditLogWhereInput = {
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actorId ? { actorId } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return ok({ logs, total });
}, ['ADMIN']);
