import { prisma, Prisma } from '@/lib/prisma';
import { notifyUsers, writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, created, fail } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { leaveListQuerySchema, submitLeaveSchema } from '@/lib/validation/leave.schema';
import { parseJson, parseSearchParams } from '@/lib/validation/common';
import { withAuth, readBody } from '@/utils/apiWrapper';

const leaveInclude = {
  user: { select: { id: true, name: true, email: true, role: true, status: true } },
  reviewer: { select: { id: true, name: true, email: true } },
};

export const GET = withAuth(async (req) => {
  const parsed = parseSearchParams(leaveListQuerySchema, new URL(req.url).searchParams);
  if (!parsed.success) return fail(parsed.message);

  const { status, skip, take } = parsed.data;
  const where: Prisma.LeaveRequestWhereInput = {
    ...(status ? { status } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: leaveInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return ok({ requests, total });
}, ['ADMIN', 'HR_MANAGER']);

export const POST = withAuth(async (req, _context, actor) => {
  const parsed = parseJson(submitLeaveSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const startDate = utcDay(parsed.data.startDate);
  const endDate = utcDay(parsed.data.endDate);
  if (endDate < startDate) return fail('endDate must be on or after startDate');

  const request = await withTx(async (tx) => {
    const createdRequest = await tx.leaveRequest.create({
      data: {
        userId: actor.id,
        leaveType: parsed.data.leaveType,
        startDate,
        endDate,
        reason: parsed.data.reason,
      },
      include: leaveInclude,
    });

    await writeAudit(tx, {
      actorId: actor.id,
      action: 'LEAVE_SUBMITTED',
      entityType: 'LeaveRequest',
      entityId: createdRequest.id,
    });

    const reviewers = await tx.user.findMany({
      where: {
        deletedAt: null,
        deactivatedAt: null,
        status: 'ACTIVE',
        role: actor.role === 'EMPLOYEE' ? { in: ['ADMIN', 'HR_MANAGER'] } : 'ADMIN',
      },
      select: { id: true },
    });
    await notifyUsers(
      tx,
      reviewers.map((u) => u.id).filter((id) => id !== actor.id),
      'LEAVE_SUBMITTED',
      { leaveRequestId: createdRequest.id, userId: actor.id }
    );

    return createdRequest;
  });

  return created(request, 'Leave request submitted');
});
