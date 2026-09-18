'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import MessageComposer from './MessageComposer';

interface Message {
  id: string;
  content: string | null;
  createdAt: string;
  editedAt: string | null;
  sender: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
  attachments: {
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }[];
}

interface Props {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
  myLastReadAt: string | null;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function dayLabel(d: Date): string {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: today.getUTCFullYear() === target.getUTCFullYear() ? undefined : 'numeric',
  }).format(target);
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function avatarInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
  myLastReadAt,
}: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages] = useState<Message[]>(initialMessages);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Mark conversation as read once on mount (if there's anything new)
  useEffect(() => {
    async function markRead() {
      try {
        await fetch(`/api/conversations/${conversationId}/read`, { method: 'PATCH' });
        // Silent — no toast, no refresh. Unread badge clears on next navigation.
      } catch {
        // ignore
      }
    }
    // Only if the last message is newer than lastReadAt (or no lastReadAt yet)
    const last = initialMessages[initialMessages.length - 1];
    if (!last) return;
    if (!myLastReadAt || new Date(last.createdAt) > new Date(myLastReadAt)) {
      markRead();
    }
  }, [conversationId, initialMessages, myLastReadAt]);

  // Group messages by day for date dividers
  const grouped: { day: string; items: Message[] }[] = [];
  messages.forEach((m) => {
    const d = new Date(m.createdAt);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    const existing = grouped[grouped.length - 1];
    if (existing && sameDay(new Date(existing.items[0].createdAt), d)) {
      existing.items.push(m);
    } else {
      grouped.push({ day: dayLabel(d), items: [m] });
    }
  });

  return (
    <>
      {/* Thread scroll area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-slate-950 md:px-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                No messages yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Send the first message to start the conversation.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {grouped.map((group, gi) => (
              <div key={gi} className="space-y-3">
                <div className="flex justify-center">
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {group.day}
                  </span>
                </div>
                {group.items.map((m, mi) => {
                  const isMine = m.sender.id === currentUserId;
                  const prev = group.items[mi - 1];
                  const showAvatar = !prev || prev.sender.id !== m.sender.id;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className="w-8 flex-shrink-0">
                        {!isMine && showAvatar && (
                          <SenderAvatar sender={m.sender} />
                        )}
                      </div>

                      {/* Bubble */}
                      <div className={`flex max-w-[75%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {!isMine && showAvatar && (
                          <p className="mb-1 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {m.sender.name}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                            isMine
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {m.content && (
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          )}

                          {m.attachments.length > 0 && (
                            <div className={`${m.content ? 'mt-2' : ''} space-y-1.5`}>
                              {m.attachments.map((a) => (
                                <AttachmentChip
                                  key={a.id}
                                  attachment={a}
                                  isMine={isMine}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className={`mt-1 px-1 text-[10px] text-slate-400 dark:text-slate-500`}>
                          {timeLabel(m.createdAt)}
                          {m.editedAt && ' · edited'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <MessageComposer conversationId={conversationId} />
    </>
  );
}

// ---------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------

function SenderAvatar({ sender }: { sender: Message['sender'] }) {
  if (sender.profileImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sender.profileImage} alt={sender.name} className="h-8 w-8 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600 text-[10px] font-bold text-white">
      {avatarInitials(sender.name)}
    </span>
  );
}

function AttachmentChip({
  attachment,
  isMine,
}: {
  attachment: Message['attachments'][number];
  isMine: boolean;
}) {
  const isImage = attachment.mimeType.startsWith('image/');
  const baseCls = isMine
    ? 'bg-white/15 text-white hover:bg-white/25'
    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

  async function download() {
    try {
      const res = await fetch(`/api/attachments/${attachment.id}/download`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download attachment');
    }
  }

  return (
    <button
      onClick={download}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${baseCls}`}
    >
      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        {isImage ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        )}
      </svg>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{attachment.fileName}</p>
        <p className="text-[10px] opacity-75">{formatBytes(attachment.fileSize)}</p>
      </div>
    </button>
  );
}