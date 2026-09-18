import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/http/responses';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, context) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid audit log id');

  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  if (!log) return fail('Audit log not found', 404);
  return ok(log);
}, ['ADMIN']);
