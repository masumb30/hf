'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface Props {
  requestId: string;
  status: string;
  canAct: boolean;
  canCancel: boolean;
}

type Dialog = null | 'approve' | 'reject' | 'cancel';

export default function LeaveReviewActions({ requestId, status, canAct, canCancel }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  async function submit(action: 'approve' | 'reject' | 'cancel') {
    setPending(action);
    try {
      const body = action === 'cancel' ? undefined : { reviewNote: note.trim() || undefined };
      const res = await fetch(`/api/leave/${requestId}/${action}`, {
        method: 'PATCH',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Request failed');
      }
      toast.success(
        action === 'approve' ? 'Leave approved' :
        action === 'reject' ? 'Leave rejected' :
        'Leave request cancelled'
      );
      setDialog(null);
      setNote('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {canAct && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Review
          </h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setDialog('approve')}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Approve request
            </button>
            <button
              onClick={() => setDialog('reject')}
              className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
            >
              Reject request
            </button>
          </div>
        </section>
      )}

      {canCancel && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Your request
          </h2>
          <button
            onClick={() => setDialog('cancel')}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel request
          </button>
        </section>
      )}

      {dialog === 'approve' && (
        <Modal onClose={() => !pending && setDialog(null)} title="Approve leave request">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Approve this leave request? You can optionally add a note for the requester.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Optional note…"
            disabled={!!pending}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setDialog(null)}
              disabled={!!pending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => submit('approve')}
              disabled={!!pending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? 'Approving…' : 'Approve'}
            </button>
          </div>
        </Modal>
      )}

      {dialog === 'reject' && (
        <Modal onClose={() => !pending && setDialog(null)} title="Reject leave request">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Reject this leave request? Add a note to explain the decision.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Reason for rejection (recommended)…"
            disabled={!!pending}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setDialog(null)}
              disabled={!!pending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => submit('reject')}
              disabled={!!pending}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {pending ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </Modal>
      )}

      {dialog === 'cancel' && (
        <Modal onClose={() => !pending && setDialog(null)} title="Cancel leave request">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Cancel this leave request? This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setDialog(null)}
              disabled={!!pending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Keep it
            </button>
            <button
              onClick={() => submit('cancel')}
              disabled={!!pending}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {pending ? 'Cancelling…' : 'Cancel request'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}