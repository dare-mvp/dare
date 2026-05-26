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
import { freezeUser } from '@/app/admin/actions';

export function FreezeUserButton({ userId, username }: { userId: string; username: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleFreeze() {
    if (note.trim().length < 5) {
      setError('Note must be at least 5 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await freezeUser(userId, note.trim());
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Freeze failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        onClick={() => { setOpen(true); setNote(''); setError(''); }}
      >
        Freeze account
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/8 bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="font-syne text-foreground">
              Freeze @{username}?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="freeze-note">Admin note (required, min 5 characters)</Label>
            <textarea
              id="freeze-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Reason for freezing this account…"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleFreeze}
              disabled={submitting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {submitting ? 'Freezing…' : 'Confirm freeze'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
