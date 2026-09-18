import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid leave id');

  const request = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!request) return fail('Leave request not found', 404);
  if (request.userId !== actor.id) return fail('Forbidden', 403);
  if (request.status !== 'PENDING') return fail('Only pending requests can be cancelled');

  const updated = await withTx(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'LEAVE_CANCELLED',
      entityType: 'LeaveRequest',
      entityId: id,
    });
    return result;
  });

  return ok(updated, 'Leave request cancelled');
});
