'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { decideKyc } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

type Tab = 'pending' | 'approved' | 'rejected';

type KycRow = {
  id: string;
  status: string;
  tier_requested: string;
  submitted_at: string;
  user_id: string;
  documents: Record<string, unknown> | null;
  profiles: { username: string; kyc_tier: string | null }[] | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
};

export default function KycPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KycRow | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [tierGranted, setTierGranted] = useState('kyc1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);
    supabase
      .from('kyc_verifications')
      .select('id, status, tier_requested, submitted_at, user_id, documents, profiles(username, kyc_tier)')
      .eq('status', tab)
      .order('submitted_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRows((data as KycRow[]) ?? []);
        setLoading(false);
      });
  }, [tab]);

  async function handleDecide() {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      await decideKyc(
        selected.id,
        decision,
        decision === 'approved' ? tierGranted : null,
        reason.trim() || null,
      );
      setSelected(null);
      setRows((prev) => prev.filter((r) => r.id !== selected.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="bg-brand-surface">
          {(['pending', 'approved', 'rejected'] as Tab[]).map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-xl border border-white/8 bg-brand-surface overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">No KYC submissions found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/8 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Username</th>
                <th className="px-4 py-3 text-left font-medium">Tier requested</th>
                <th className="px-4 py-3 text-left font-medium">Current tier</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Submitted</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-white/3"
                  onClick={() => {
                    setSelected(row);
                    setDecision('approved');
                    setTierGranted('kyc1');
                    setReason('');
                    setError('');
                  }}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.profiles?.[0]?.username ?? row.user_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {row.tier_requested}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.profiles?.[0]?.kyc_tier ?? 'none'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${STATUS_BADGE[row.status] ?? ''}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(row.submitted_at).toLocaleDateString('en-NG')}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelected(row); }}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="border-white/8 bg-brand-surface w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-syne text-foreground">KYC Review</SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="mt-6 space-y-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-medium text-foreground">
                  {selected.profiles?.[0]?.username ?? selected.user_id}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tier requested</p>
                <p className="font-mono text-sm text-foreground">{selected.tier_requested}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current tier</p>
                <p className="font-mono text-sm text-foreground">
                  {selected.profiles?.[0]?.kyc_tier ?? 'none'}
                </p>
              </div>

              {selected.documents && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Submitted documents</p>
                  <pre className="rounded-lg bg-brand-bg p-3 text-xs text-foreground overflow-auto">
                    {JSON.stringify(selected.documents, null, 2)}
                  </pre>
                </div>
              )}

              <div className="space-y-3 border-t border-white/8 pt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="kyc-decision">Decision</Label>
                  <select
                    id="kyc-decision"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as 'approved' | 'rejected')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>

                {decision === 'approved' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="kyc-tier-granted">Grant tier</Label>
                    <select
                      id="kyc-tier-granted"
                      value={tierGranted}
                      onChange={(e) => setTierGranted(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="kyc1">KYC 1</option>
                      <option value="kyc2">KYC 2</option>
                      <option value="kyc3">KYC 3</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Reason (optional)</Label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
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
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
