import { redirect } from 'next/navigation';

import ConversationList from './_components/ConversationList';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE';

  // ---- Find all conversations where the user is an active participant ----
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: session.id, isActive: true },
    select: { conversationId: true, lastReadAt: true },
  });

  const conversationIds = participants.map((p) => p.conversationId);
  const lastReadMap = new Map(participants.map((p) => [p.conversationId, p.lastReadAt]));

  const conversations =
    conversationIds.length === 0
      ? []
      : await prisma.conversation.findMany({
          where: { id: { in: conversationIds } },
          orderBy: { lastMessageAt: 'desc' },
          include: {
            participants: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    profileImage: true,
                  },
                },
                department: { select: { id: true, name: true } },
              },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                createdAt: true,
                sender: { select: { id: true, name: true } },
                _count: { select: { attachments: true } },
              },
            },
            _count: {
              select: {
                messages: {
                  where: {
                    deletedAt: null,
                    senderId: { not: session.id },
                  },
                },
              },
            },
          },
        });

  // Compute unread per conversation: messages since lastReadAt from others
  const unreadCounts: Record<string, number> = {};
  await Promise.all(
    conversations.map(async (c) => {
      const lastRead = lastReadMap.get(c.id);
      const count = await prisma.message.count({
        where: {
          conversationId: c.id,
          deletedAt: null,
          senderId: { not: session.id },
          ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
        },
      });
      unreadCounts[c.id] = count;
    })
  );

  // ---- For "New conversation" dialog ----
  const [allUsers, departments, headedDepartments] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        deactivatedAt: null,
        status: 'ACTIVE',
        id: { not: session.id },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.department.findMany({
      select: { id: true, name: true, parentId: true },
      orderBy: { name: 'asc' },
    }),
    prisma.department.findMany({
      where: { headId: session.id },
      select: { id: true, name: true },
    }),
  ]);

  // ------- Shape for client -------
  const shapedConversations = conversations.map((c) => {
    const otherParticipants = c.participants.filter((p) => p.userId !== session.id);
    const lastMessage = c.messages[0] ?? null;

    return {
      id: c.id,
      type: c.type,
      title: c.title,
      lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
      updatedAt: c.updatedAt.toISOString(),
      unreadCount: unreadCounts[c.id] ?? 0,
      // For DIRECT: the other user (used for name + avatar)
      // For ORGANIZATIONAL: summary of participants
      otherUser:
        c.type === 'DIRECT' && otherParticipants[0]?.user
          ? {
              id: otherParticipants[0].user.id,
              name: otherParticipants[0].user.name,
              email: otherParticipants[0].user.email,
              role: otherParticipants[0].user.role,
              profileImage: otherParticipants[0].user.profileImage,
            }
          : null,
      participants: c.participants.map((p) => ({
        id: p.id,
        user: p.user
          ? {
              id: p.user.id,
              name: p.user.name,
              profileImage: p.user.profileImage,
            }
          : null,
        department: p.department
          ? { id: p.department.id, name: p.department.name }
          : null,
      })),
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt.toISOString(),
            senderName: lastMessage.sender.name,
            senderId: lastMessage.sender.id,
            hasAttachments: lastMessage._count.attachments > 0,
          }
        : null,
    };
  });

  const canCreateOrgConversations =
    role === 'ADMIN' || role === 'HR_MANAGER' || headedDepartments.length > 0;

  return (
    <div className="p-4 md:p-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Messages</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your conversations across the organization.
          </p>
        </div>
      </header>

      <ConversationList
        conversations={shapedConversations}
        users={allUsers}
        departments={departments}
        headedDepartments={headedDepartments}
        currentUser={{ id: session.id, name: session.name, role }}
        canCreateOrgConversations={canCreateOrgConversations}
      />
    </div>
  );
}