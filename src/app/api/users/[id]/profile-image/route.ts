import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, fail } from '@/lib/http/responses';
import { userPublicSelect } from '@/lib/permissions';
import { uploadObject } from '@/lib/storage/object-storage';
import { objectIdSchema } from '@/lib/validation/common';
import { withAuth, paramId } from '@/utils/apiWrapper';

export const PATCH = withAuth(async (req, context, actor) => {
  const id = await paramId(context);
  if (!objectIdSchema.safeParse(id).success) return fail('Invalid user id');
  if (actor.id !== id) return fail('You can only update your own profile image', 403);

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return fail('file is required');

  const { storageKey } = await uploadObject(file, file.name);
  const user = await withTx(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { profileImage: storageKey },
      select: userPublicSelect,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'PROFILE_IMAGE_UPDATED',
      entityType: 'User',
      entityId: id,
    });
    return updated;
  });

  return ok(user, 'Profile image updated');
});
