import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/http/responses';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid leave id');

  const request = await prisma.leaveRequest.findFirst({
    where: { id, userId: actor.id },
    include: {
      reviewer: { select: { id: true, name: true, email: true } },
    },
  });
  if (!request) return fail('Leave request not found', 404);
  return ok(request);
});
