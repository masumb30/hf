import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/http/responses';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const DELETE = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid notification id');

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== actor.id) {
    return fail('Notification not found', 404);
  }

  await prisma.notification.delete({ where: { id } });
  return ok({ id }, 'Notification deleted');
});
