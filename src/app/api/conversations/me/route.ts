import { ok } from '@/lib/http/responses';
import { listAccessibleConversations } from '@/lib/conversations';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async (_req, _context, actor) => {
  const conversations = await listAccessibleConversations(actor);
  return ok({ conversations });
});
