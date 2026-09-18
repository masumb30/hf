import { prisma } from '@/lib/prisma';
import type { AuthUser } from '@/utils/apiWrapper';
import { canViewConversation, getDescendantDepartments } from '@/lib/permissions';

const conversationInclude = {
  participants: {
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      department: { select: { id: true, name: true, path: true } },
    },
  },
};

export { conversationInclude };

export async function listAccessibleConversations(actor: AuthUser) {
  const orFilters: object[] = [
    { participants: { some: { userId: actor.id, isActive: true } } },
  ];

  if (actor.departmentId) {
    orFilters.push({
      participants: { some: { departmentId: actor.departmentId, isActive: true } },
    });
    const actorDept = await prisma.department.findUnique({
      where: { id: actor.departmentId },
    });
    const descendants = await getDescendantDepartments(
      actor.departmentId,
      actorDept?.path
    );
    if (descendants.length > 0) {
      orFilters.push({
        type: 'ORGANIZATIONAL',
        participants: {
          some: {
            isActive: true,
            departmentId: { in: descendants.map((d) => d.id) },
          },
        },
      });
    }
  }

  const conversations = await prisma.conversation.findMany({
    where: { OR: orFilters },
    include: conversationInclude,
    orderBy: { lastMessageAt: 'desc' },
  });

  const visible = [];
  for (const conversation of conversations) {
    if (await canViewConversation(actor, conversation)) {
      visible.push(conversation);
    }
  }
  return visible;
}

export async function conversationRecipientUserIds(
  conversationId: string,
  excludeUserId: string
) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId, isActive: true },
  });
  const userIds = new Set<string>();
  const departmentIds: string[] = [];
  for (const p of participants) {
    if (p.userId) userIds.add(p.userId);
    if (p.departmentId) departmentIds.push(p.departmentId);
  }
  if (departmentIds.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        departmentId: { in: departmentIds },
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    users.forEach((u) => userIds.add(u.id));
  }
  userIds.delete(excludeUserId);
  return [...userIds];
}
