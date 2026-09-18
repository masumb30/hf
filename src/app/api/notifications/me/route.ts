import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async (req, _context, actor) => {
  const unreadOnly = new URL(req.url).searchParams.get('unread') === 'true';
  const notifications = await prisma.notification.findMany({
    where: {
      userId: actor.id,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  return ok({ notifications });
});
