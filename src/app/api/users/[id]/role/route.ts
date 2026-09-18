import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { userPublicSelect } from '@/lib/permissions';
import { changeRoleSchema } from '@/lib/validation/user.schema';
import { objectIdSchema, parseJson } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid user id');
  if (actor.id === id) return fail('You cannot change your own role', 403);

  const parsed = parseJson(changeRoleSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return fail('User not found', 404);

  const user = await withTx(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: userPublicSelect,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: id,
      metadata: { role: parsed.data.role },
    });
    return updated;
  });

  return ok(user, 'User role updated');
}, ['ADMIN']);
