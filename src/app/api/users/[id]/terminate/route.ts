import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { userPublicSelect } from '@/lib/permissions';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid user id');
  if (actor.id === id) return fail('You cannot terminate your own account', 403);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return fail('User not found', 404);
  if (actor.role === 'HR_MANAGER' && existing.role !== 'EMPLOYEE') {
    return fail('HR managers can only terminate employees', 403);
  }

  const user = await withTx(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { status: 'TERMINATED', deactivatedAt: new Date() },
      select: userPublicSelect,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'USER_TERMINATED',
      entityType: 'User',
      entityId: id,
    });
    return updated;
  });

  return ok(user, 'User terminated');
}, ['ADMIN', 'HR_MANAGER']);
