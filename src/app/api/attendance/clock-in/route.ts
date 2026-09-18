import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { created, fail } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { withAuth } from '@/utils/apiWrapper';

export const POST = withAuth(async (_req, _context, actor) => {
  const date = utcDay();
  const existing = await prisma.attendance.findFirst({
    where: { userId: actor.id, date },
  });
  if (existing) return fail('Already clocked in for today');

  const record = await withTx(async (tx) => {
    const createdRecord = await tx.attendance.create({
      data: { userId: actor.id, date, clockIn: new Date() },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'ATTENDANCE_CLOCK_IN',
      entityType: 'Attendance',
      entityId: createdRecord.id,
    });
    return createdRecord;
  });

  return created(record, 'Clocked in');
});
