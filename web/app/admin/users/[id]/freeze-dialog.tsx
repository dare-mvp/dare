'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { freezeUserAction } from '@/app/admin/actions';

export function FreezeDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const canSubmit = note.trim().length >= 5 && !isPending;

  async function handleSubmit() {
    setError('');
    startTransition(async () => {
      try {
        await freezeUserAction(userId, note);
        setOpen(false);
        setNote('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed. Try again.');
      }
    });
  }

  function handleClose() {
    if (!isPending) {
      setOpen(false);
      setNote('');
      setError('');
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Freeze account
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="bg-brand-surface text-foreground">
          <DialogHeader>
            <DialogTitle className="font-syne">Freeze account</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              The account will be immediately restricted. This action will be logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="freeze-note">Admin note (required)</Label>
              <textarea
                id="freeze-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                rows={3}
                disabled={isPending}
                placeholder="Reason for freezing this account…"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">Minimum 5 characters.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit}>
              {isPending ? 'Freezing…' : 'Freeze'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
