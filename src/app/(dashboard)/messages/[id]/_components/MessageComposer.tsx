'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface Props {
  conversationId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

export default function MessageComposer({ conversationId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  function pickFiles(ev: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(ev.target.files ?? []);
    const valid: File[] = [];
    for (const f of picked) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 10 MB limit`);
        continue;
      }
      valid.push(f);
    }
    const next = [...files, ...valid].slice(0, MAX_FILES);
    if (next.length < files.length + valid.length) {
      toast.info(`Up to ${MAX_FILES} attachments per message.`);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!content.trim() && files.length === 0) return;
    if (submitting) return;

    setSubmitting(true);
    setUploadProgress(0);

    try {
      // 1. Create the message
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Could not send message');
      }

      const data = await res.json().catch(() => ({}));
      const messageId: string | undefined = data?.id;

      // 2. Upload attachments (if any)
      if (messageId && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const fd = new FormData();
          fd.append('file', files[i]);
          const upRes = await fetch(`/api/messages/${messageId}/attachments`, {
            method: 'POST',
            body: fd,
          });
          if (!upRes.ok) {
            const d = await upRes.json().catch(() => ({}));
            throw new Error(d?.message ?? `Failed to upload ${files[i].name}`);
          }
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        }
      }

      // 3. Reset and refresh
      setContent('');
      setFiles([]);
      setUploadProgress(0);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(ev: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      handleSubmit(ev as unknown as React.FormEvent);
    }
  }

  const canSend = (content.trim().length > 0 || files.length > 0) && !submitting;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 md:px-6 md:py-4"
    >
      <div className="mx-auto max-w-3xl space-y-2">
        {/* File chips */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs dark:bg-slate-800"
              >
                <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="max-w-[140px] truncate text-slate-700 dark:text-slate-300">
                  {f.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={submitting}
                  className="text-slate-400 hover:text-rose-500 disabled:opacity-50"
                  aria-label={`Remove ${f.name}`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* Composer row */}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting || files.length >= MAX_FILES}
            className="flex-shrink-0 rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Attach files"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
            onChange={pickFiles}
            disabled={submitting}
            className="hidden"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitting}
            rows={1}
            placeholder="Type a message…  (Enter to send · Shift+Enter for newline)"
            className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />

          <button
            type="submit"
            disabled={!canSend}
            className="flex-shrink-0 rounded-xl bg-indigo-600 p-2.5 text-white hover:bg-indigo-700 disabled:opacity-40"
            aria-label="Send message"
          >
            {submitting ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}