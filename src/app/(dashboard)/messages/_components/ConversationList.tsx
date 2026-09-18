'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import NewConversationDialog from './NewConversationDialog';

interface ShapedConversation {
  id: string;
  type: string;
  title: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  unreadCount: number;
  otherUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    profileImage: string | null;
  } | null;
  participants: {
    id: string;
    user: { id: string; name: string; profileImage: string | null } | null;
    department: { id: string; name: string } | null;
  }[];
  lastMessage: {
    id: string;
    content: string | null;
    createdAt: string;
    senderName: string;
    senderId: string;
    hasAttachments: boolean;
  } | null;
}

interface Props {
  conversations: ShapedConversation[];
  users: { id: string; name: string; email: string; role: string }[];
  departments: { id: string; name: string; parentId: string | null }[];
  headedDepartments: { id: string; name: string }[];
  currentUser: { id: string; name: string; role: string };
  canCreateOrgConversations: boolean;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

function avatarInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function ConversationList({
  conversations,
  users,
  departments,
  headedDepartments,
  currentUser,
  canCreateOrgConversations,
}: Props) {
  const [q, setQ] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!q.trim()) return conversations;
    const needle = q.toLowerCase();
    return conversations.filter((c) => {
      const names: string[] = [];
      if (c.otherUser?.name) names.push(c.otherUser.name);
      if (c.title) names.push(c.title);
      c.participants.forEach((p) => {
        if (p.user?.name) names.push(p.user.name);
        if (p.department?.name) names.push(p.department.name);
      });
      if (c.lastMessage?.content) names.push(c.lastMessage.content);
      return names.some((n) => n.toLowerCase().includes(needle));
    });
  }, [q, conversations]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New conversation
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {q ? 'No conversations match your search' : 'No conversations yet'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {q ? 'Try a different search term.' : 'Start a new conversation to see it here.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((c) => {
              const display = getDisplay(c, currentUser.id);
              return (
                <li key={c.id}>
                  <Link
                    href={`/messages/${c.id}`}
                    className="flex items-start gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <ConversationAvatar display={display} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-sm ${
                            c.unreadCount > 0
                              ? 'font-semibold text-slate-900 dark:text-slate-100'
                              : 'font-medium text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {display.title}
                        </p>
                        <span className="flex-shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                          {relativeTime(c.lastMessage?.createdAt ?? c.updatedAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-xs ${
                            c.unreadCount > 0
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {c.lastMessage ? (
                            <>
                              <span className="font-medium">{c.lastMessage.senderName}:</span>{' '}
                              {c.lastMessage.content
                                ? c.lastMessage.content.slice(0, 80)
                                : c.lastMessage.hasAttachments
                                  ? 'Attachment'
                                  : ''}
                              {c.lastMessage.content && c.lastMessage.content.length > 80 ? '…' : ''}
                            </>
                          ) : (
                            <span className="italic text-slate-400 dark:text-slate-500">
                              No messages yet
                            </span>
                          )}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white">
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {dialogOpen && (
        <NewConversationDialog
          users={users}
          departments={departments}
          headedDepartments={headedDepartments}
          canCreateOrgConversations={canCreateOrgConversations}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------

interface Display {
  title: string;
  subtitle?: string;
  kind: 'user' | 'department' | 'group';
  image?: string | null;
  initials?: string;
}

function getDisplay(c: ShapedConversation, currentUserId: string): Display {
  if (c.type === 'DIRECT' && c.otherUser) {
    return {
      title: c.otherUser.name,
      subtitle: c.otherUser.email,
      kind: 'user',
      image: c.otherUser.profileImage,
      initials: avatarInitials(c.otherUser.name),
    };
  }

  // ORGANIZATIONAL: show title or fallback from participants
  const deptParticipants = c.participants.filter((p) => p.department);
  const userParticipants = c.participants.filter((p) => p.user && p.user.id !== currentUserId);

  if (c.title) {
    return { title: c.title, kind: 'group', initials: avatarInitials(c.title) };
  }

  if (deptParticipants.length === 1 && userParticipants.length === 0) {
    const d = deptParticipants[0].department!;
    return { title: d.name, kind: 'department', initials: avatarInitials(d.name) };
  }

  // Group: list up to 3 names
  const names: string[] = [];
  deptParticipants.forEach((p) => p.department && names.push(p.department.name));
  userParticipants.forEach((p) => p.user && names.push(p.user.name));
  const preview = names.slice(0, 3).join(', ');
  const suffix = names.length > 3 ? ` +${names.length - 3}` : '';

  return {
    title: preview || 'Conversation',
    subtitle: `${names.length} participants`,
    kind: 'group',
    initials: avatarInitials(preview || 'Group'),
    ...(suffix ? { subtitle: `${names.length} participants${suffix}` } : {}),
  };
}

function ConversationAvatar({ display }: { display: Display }) {
  if (display.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={display.image}
        alt={display.title}
        className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
      />
    );
  }
  const color =
    display.kind === 'department'
      ? 'bg-violet-600'
      : display.kind === 'group'
        ? 'bg-slate-600'
        : 'bg-indigo-600';
  return (
    <span
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}
    >
      {display.initials ?? '?'}
    </span>
  );
}