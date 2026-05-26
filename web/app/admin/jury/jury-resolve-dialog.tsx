'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { resolveJuryCaseAction } from '@/app/admin/actions';

type Verdict = 'A' | 'B' | 'void' | 'uphold' | 'overturn';

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: 'A', label: 'A wins' },
  { value: 'B', label: 'B wins' },
  { value: 'void', label: 'Void' },
  { value: 'uphold', label: 'Uphold dispute' },
  { value: 'overturn', label: 'Overturn dispute' },
];

export function JuryResolveDialog({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>('A');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleResolve() {
    if (rationale.trim().length < 10) {
      setError('Rationale must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await resolveJuryCaseAction(caseId, verdict, rationale.trim());
      setOpen(false);
      setRationale('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resolve failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
        onClick={() => { setOpen(true); setVerdict('A'); setRationale(''); setError(''); }}
      >
        Resolve
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/8 bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="font-syne text-foreground">Resolve case</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">Verdict</legend>
              <div className="space-y-2">
                {VERDICTS.map((v) => (
                  <label key={v.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="verdict"
                      value={v.value}
                      checked={verdict === v.value}
                      onChange={() => setVerdict(v.value)}
                      className="accent-brand-primary"
                    />
                    <span className="text-sm text-foreground">{v.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="jury-rationale">
                Rationale (required, min 10 characters)
              </Label>
              <textarea
                id="jury-rationale"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Explain the basis for this verdict…"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleResolve}
              disabled={submitting || rationale.trim().length < 10}
              className="bg-brand-primary text-white hover:opacity-90"
            >
              {submitting ? 'Saving…' : 'Submit verdict'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
