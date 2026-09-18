import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, _context, actor) => {
  const requests = await prisma.leaveRequest.findMany({
    where: { userId: actor.id },
    include: {
      reviewer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return ok({ requests });
});
