'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { approveWithdrawalAction, rejectWithdrawalAction } from '@/app/admin/actions';

export function WithdrawalActions({ id }: { id: string }) {
  const [dialogType, setDialogType] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleAction() {
    if (!dialogType) return;
    if (note.trim().length < 5) {
      setError('Note must be at least 5 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (dialogType === 'approve') await approveWithdrawalAction(id, note.trim());
      else await rejectWithdrawalAction(id, note.trim());
      setDialogType(null);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
          onClick={() => { setDialogType('approve'); setNote(''); setError(''); }}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          onClick={() => { setDialogType('reject'); setNote(''); setError(''); }}
        >
          Reject
        </Button>
      </div>

      <Dialog open={!!dialogType} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="border-white/8 bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="font-syne text-foreground">
              {dialogType === 'approve' ? 'Approve' : 'Reject'} withdrawal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="withdrawal-note">Admin note (required, min 5 characters)</Label>
            <textarea
              id="withdrawal-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Reason for this decision…"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={submitting || note.trim().length < 5}
              className={dialogType === 'approve'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'}
            >
              {submitting ? 'Saving…' : dialogType === 'approve' ? 'Confirm approve' : 'Confirm reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
