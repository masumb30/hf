import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { listAccessibleConversations } from '@/lib/conversations';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, _context, actor) => {
  const conversations = await listAccessibleConversations(actor);
  const ids = conversations.map((c) => c.id);
  if (ids.length === 0) return ok({ messages: [] });

  const messages = await prisma.message.findMany({
    where: { conversationId: { in: ids }, deletedAt: null },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      conversation: { select: { id: true, type: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  return ok({ messages });
});
