import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (_req, _context, actor) => {
  const result = await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  return ok({ count: result.count }, 'All notifications marked as read');
});
