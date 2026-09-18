import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async () => {
  const requests = await prisma.leaveRequest.findMany({
    where: { status: { in: ['APPROVED', 'REJECTED', 'CANCELLED'] } },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { reviewedAt: 'desc' },
  });
  return ok({ requests });
}, ['ADMIN', 'HR_MANAGER']);
