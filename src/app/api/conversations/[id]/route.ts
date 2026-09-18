import { ok, fail } from '@/lib/http/responses';
import { conversationInclude } from '@/lib/conversations';
import { requireConversationAccess } from '@/lib/permissions';
import { objectIdSchema } from '@/lib/validation/common';
import { prisma } from '@/lib/prisma';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid conversation id');

  const { conversation, allowed } = await requireConversationAccess(actor, id);
  if (!conversation) return fail('Conversation not found', 404);
  if (!allowed) return fail('Forbidden', 403);

  const full = await prisma.conversation.findUnique({
    where: { id },
    include: conversationInclude,
  });
  return ok(full);
});
