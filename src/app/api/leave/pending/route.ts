import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

const leaveInclude = {
  user: { select: { id: true, name: true, email: true, role: true, status: true } },
};

export const GET = withAuth(async (_req, _context, actor) => {
  const where =
    actor.role === 'ADMIN'
      ? { status: 'PENDING' as const }
      : { status: 'PENDING' as const, user: { role: 'EMPLOYEE' as const } };

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: leaveInclude,
    orderBy: { createdAt: 'asc' },
  });

  return ok({ requests });
}, ['ADMIN', 'HR_MANAGER']);
