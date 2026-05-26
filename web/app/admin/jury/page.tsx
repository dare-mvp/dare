'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { assignJuryCase, resolveJuryCase } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

type Tab = 'open' | 'escalated' | 'resolved';

const TAB_STATUSES: Record<Tab, string[]> = {
  open: ['filed', 'accepted_for_review', 'jury_assignment', 'jury_voting'],
  escalated: ['escalated'],
  resolved: ['verdict_reached', 'settlement_pending', 'closed', 'voided'],
};

const STATUS_BADGE: Record<string, string> = {
  filed: 'bg-blue-500/20 text-blue-400',
  accepted_for_review: 'bg-blue-500/20 text-blue-400',
  jury_assignment: 'bg-yellow-500/20 text-yellow-400',
  jury_voting: 'bg-yellow-500/20 text-yellow-400',
  escalated: 'bg-red-500/20 text-red-400',
  verdict_reached: 'bg-green-500/20 text-green-400',
  settlement_pending: 'bg-green-500/20 text-green-400',
  closed: 'bg-white/10 text-muted-foreground',
  voided: 'bg-white/10 text-muted-foreground',
};

const VERDICTS = [
  { value: 'A', label: 'A wins' },
  { value: 'B', label: 'B wins' },
  { value: 'void', label: 'Void' },
  { value: 'uphold', label: 'Uphold' },
  { value: 'overturn', label: 'Overturn' },
];

type JuryRow = {
  id: string;
  dare_id: string;
  status: string;
  votes_cast: number | null;
  votes_needed: number | null;
  created_at: string;
};

export default function JuryPage() {
  const [tab, setTab] = useState<Tab>('open');
  const [rows, setRows] = useState<JuryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<JuryRow | null>(null);
  const [verdict, setVerdict] = useState('A');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);
    supabase
      .from('jury_cases')
      .select('id, dare_id, status, votes_cast, votes_needed, created_at')
      .in('status', TAB_STATUSES[tab])
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRows((data as JuryRow[]) ?? []);
        setLoading(false);
      });
  }, [tab]);

  async function handleAssign(caseId: string) {
    try {
      await assignJuryCase(caseId);
      setRows((prev) => prev.filter((r) => r.id !== caseId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleResolve() {
    if (!resolveTarget) return;
    setSubmitting(true);
    setError('');
    try {
      await resolveJuryCase(resolveTarget.id, verdict, rationale.trim());
      setResolveTarget(null);
      setRows((prev) => prev.filter((r) => r.id !== resolveTarget.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resolve failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="bg-brand-surface">
          {(['open', 'escalated', 'resolved'] as Tab[]).map((t) => (
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
          <p className="px-6 py-8 text-sm text-muted-foreground">No jury cases found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/8 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Case ID</th>
                <th className="px-4 py-3 text-left font-medium">DARE ID</th>
                <th className="px-4 py-3 text-left font-medium">Votes</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {row.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.dare_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {row.votes_cast ?? 0} / {row.votes_needed ?? '?'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${STATUS_BADGE[row.status] ?? 'bg-white/10 text-muted-foreground'}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString('en-NG')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {tab === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssign(row.id)}
                        >
                          Assign
                        </Button>
                      )}
                      {tab === 'escalated' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                          onClick={() => {
                            setResolveTarget(row);
                            setVerdict('A');
                            setRationale('');
                            setError('');
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!resolveTarget} onOpenChange={() => setResolveTarget(null)}>
        <DialogContent className="border-white/8 bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="font-syne text-foreground">Resolve case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Verdict</Label>
              <select
                value={verdict}
                onChange={(e) => setVerdict(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {VERDICTS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Rationale</Label>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Explain the basis for this verdict…"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
            <Button
              onClick={handleResolve}
              disabled={submitting}
              className="bg-brand-primary text-white hover:opacity-90"
            >
              {submitting ? 'Saving…' : 'Submit verdict'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
