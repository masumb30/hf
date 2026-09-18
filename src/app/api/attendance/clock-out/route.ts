import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { utcDay } from '@/lib/permissions';
import { withAuth } from '@/utils/apiWrapper';

export const POST = withAuth(async (_req, _context, actor) => {
  const date = utcDay();
  const existing = await prisma.attendance.findFirst({
    where: { userId: actor.id, date },
  });
  if (!existing) return fail('No clock-in found for today');
  if (existing.clockOut) return fail('Already clocked out for today');

  const record = await withTx(async (tx) => {
    const updated = await tx.attendance.update({
      where: { id: existing.id },
      data: { clockOut: new Date() },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'ATTENDANCE_CLOCK_OUT',
      entityType: 'Attendance',
      entityId: updated.id,
    });
    return updated;
  });

  return ok(record, 'Clocked out');
});
