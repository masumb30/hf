import { prisma } from '@/lib/prisma';
import { notifyUsers, writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { canReviewLeave } from '@/lib/permissions';
import { reviewLeaveSchema } from '@/lib/validation/leave.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid leave id');

  const parsed = parseJson(reviewLeaveSchema, await readBody(req) ?? {});
  if (!parsed.success) return fail(parsed.message);

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!request) return fail('Leave request not found', 404);
  if (request.status !== 'PENDING') return fail('Only pending requests can be approved');
  if (!canReviewLeave(actor, request.user)) {
    return fail('You cannot review this leave request', 403);
  }

  const updated = await withTx(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewerId: actor.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'LEAVE_APPROVED',
      entityType: 'LeaveRequest',
      entityId: id,
    });
    await notifyUsers(tx, [request.userId], 'LEAVE_APPROVED', {
      leaveRequestId: id,
    });
    return result;
  });

  return ok(updated, 'Leave request approved');
}, ['ADMIN', 'HR_MANAGER']);
