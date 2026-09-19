import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail } from '@/lib/http/responses';
import { requireConversationAccess } from '@/lib/permissions';
import { readObject } from '@/lib/storage/object-storage';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId, type AuthUser } from '@/utils/apiWrapper';

async function loadAttachment(actor: AuthUser, id: string) {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { message: true },
  });
  if (!attachment) return { attachment: null, allowed: false };
  const access = await requireConversationAccess(
    actor,
    attachment.message.conversationId
  );
  return { attachment, allowed: access.allowed };
}

export const GET = withAuth(async (_req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid attachment id');

  const { attachment, allowed } = await loadAttachment(actor, id as string);
  if (!attachment) return fail('Attachment not found', 404);
  if (!allowed) return fail('Forbidden', 403);

  try {
    const file = await readObject(attachment.storageKey);
    return new NextResponse(file, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
      },
    });
  } catch {
    return fail('File not found in storage', 404);
  }
});
