import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import MessageThread from './_components/MessageThread';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;

  // Participant check — this is the core privacy gate.
  const myParticipation = await prisma.conversationParticipant.findFirst({
    where: { conversationId: id, userId: session.id, isActive: true },
    select: { id: true, lastReadAt: true },
  });

  if (!myParticipation) notFound();

  const conversation = await prisma.conversation.findUnique({
    where: { id },
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
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { id: true, name: true, email: true, profileImage: true },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) notFound();

  const otherParticipants = conversation.participants.filter((p) => p.userId !== session.id);
  const me = conversation.participants.find((p) => p.userId === session.id);
  const isDirect = conversation.type === 'DIRECT';
  const otherUser = isDirect && otherParticipants[0]?.user ? otherParticipants[0].user : null;

  const title = isDirect && otherUser
    ? otherUser.name
    : conversation.title
      ? conversation.title
      : buildOrgTitle(conversation.participants, session.id);

  const initialMessages = conversation.messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    sender: {
      id: m.sender.id,
      name: m.sender.name,
      email: m.sender.email,
      profileImage: m.sender.profileImage,
    },
    attachments: m.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
    })),
  }));

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:px-6">
        <Link
          href="/messages"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden dark:hover:bg-slate-800"
          aria-label="Back"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <HeaderAvatar
          image={isDirect && otherUser ? otherUser.profileImage : null}
          name={title}
          kind={isDirect ? 'user' : 'group'}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {isDirect && otherUser
              ? otherUser.email
              : `${conversation.participants.length} participants`}
          </p>
        </div>
      </div>

      {/* Thread */}
      <MessageThread
        conversationId={conversation.id}
        initialMessages={initialMessages}
        currentUserId={session.id}
        myLastReadAt={me?.lastReadAt ? me.lastReadAt.toISOString() : null}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function buildOrgTitle(
  participants: { user: { id: string; name: string } | null; department: { id: string; name: string } | null }[],
  currentUserId: string
): string {
  const names: string[] = [];
  participants.forEach((p) => {
    if (p.department) names.push(p.department.name);
    else if (p.user && p.user.id !== currentUserId) names.push(p.user.name);
  });
  if (names.length === 0) return 'Conversation';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}

function HeaderAvatar({
  image,
  name,
  kind,
}: {
  image: string | null;
  name: string;
  kind: 'user' | 'group';
}) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} className="h-9 w-9 rounded-full object-cover" />;
  }
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const color = kind === 'group' ? 'bg-slate-600' : 'bg-indigo-600';
  return (
    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}>
      {initials}
    </span>
  );
}