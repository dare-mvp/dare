'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { decideKycAction } from '@/app/admin/actions';

type Props = {
  id: string;
  username: string;
  currentTier: string | null;
  tierRequested: string;
  submittedAt: string;
  documents: Record<string, unknown> | null;
};

export function KycDrawer({ id, username, currentTier, tierRequested, submittedAt, documents }: Props) {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<'approved' | 'rejected'>('approved');
  const [tierGranted, setTierGranted] = useState<'kyc1' | 'kyc2' | 'kyc3'>('kyc1');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleDecide() {
    setSubmitting(true);
    setError('');
    try {
      await decideKycAction(
        id,
        verdict,
        verdict === 'approved' ? tierGranted : null,
        adminNote.trim() || null,
      );
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Review
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="border-white/8 bg-brand-surface w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-syne text-foreground">KYC Review</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Username</p>
              <p className="font-medium text-foreground">{username}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current tier</p>
                <p className="font-mono text-sm text-foreground">{currentTier ?? 'none'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tier requested</p>
                <p className="font-mono text-sm text-foreground">{tierRequested}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Submitted at</p>
              <p className="font-mono text-sm text-foreground">
                {new Date(submittedAt).toLocaleString('en-NG')}
              </p>
            </div>

            {documents && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Submitted documents</p>
                <div className="space-y-3">
                  {Object.entries(documents).map(([key, value]) => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                    const isUrl =
                      typeof value === 'string' &&
                      (value.startsWith('http://') || value.startsWith('https://'));
                    const isImageUrl =
                      isUrl &&
                      /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value as string);
                    return (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        {isImageUrl ? (
                          <a
                            href={value as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={value as string}
                              alt={label}
                              className="max-h-48 w-full rounded-lg border border-white/8 object-contain bg-brand-bg"
                            />
                          </a>
                        ) : isUrl ? (
                          <a
                            href={value as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-sm text-brand-primary hover:underline"
                          >
                            {value as string}
                          </a>
                        ) : (
                          <p className="font-mono text-sm text-foreground break-all">
                            {value === null || value === undefined
                              ? '—'
                              : typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3 border-t border-white/8 pt-6">
              <div className="space-y-1.5">
                <Label htmlFor="kyc-verdict">Decision</Label>
                <select
                  id="kyc-verdict"
                  title="Select decision"
                  value={verdict}
                  onChange={(e) => setVerdict(e.target.value as 'approved' | 'rejected')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>

              {verdict === 'approved' && (
                <div className="space-y-1.5">
                  <Label htmlFor="kyc-tier-granted">Grant tier</Label>
                  <select
                    id="kyc-tier-granted"
                    title="Select KYC tier to grant"
                    value={tierGranted}
                    onChange={(e) => setTierGranted(e.target.value as 'kyc1' | 'kyc2' | 'kyc3')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="kyc1">KYC 1</option>
                    <option value="kyc2">KYC 2</option>
                    <option value="kyc3">KYC 3</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="kyc-admin-note">Admin note (optional)</Label>
                <textarea
                  id="kyc-admin-note"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Notes on this decision…"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                onClick={handleDecide}
                disabled={submitting}
                className="w-full bg-brand-primary text-white hover:opacity-90"
              >
                {submitting ? 'Saving…' : 'Submit decision'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
