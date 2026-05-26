'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { approveWithdrawal, rejectWithdrawal } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

type Tab = 'pending' | 'approved' | 'rejected' | 'all';

type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  destination: { bank_name?: string; account_number?: string } | null;
  created_at: string;
  user_id: string;
  profiles: { username: string }[] | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
};

export default function WithdrawalsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [dialogType, setDialogType] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);
    const query = supabase
      .from('withdrawal_requests')
      .select('id, amount, status, destination, created_at, user_id, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (tab !== 'all') query.eq('status', tab);

    query.then(({ data }) => {
      setRows((data as Withdrawal[]) ?? []);
      setLoading(false);
    });
  }, [tab]);

  async function handleAction() {
    if (!selected || !dialogType) return;
    if (note.trim().length < 5) {
      setError('Note must be at least 5 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (dialogType === 'approve') await approveWithdrawal(selected.id, note.trim());
      else await rejectWithdrawal(selected.id, note.trim());
      setSelected(null);
      setDialogType(null);
      setNote('');
      setRows((prev) => prev.filter((r) => r.id !== selected.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="bg-brand-surface">
          {(['pending', 'approved', 'rejected', 'all'] as Tab[]).map((t) => (
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
          <p className="px-6 py-8 text-sm text-muted-foreground">No withdrawals found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/8 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Username</th>
                <th className="px-4 py-3 text-left font-medium">Amount (NGN)</th>
                <th className="px-4 py-3 text-left font-medium">Bank</th>
                <th className="px-4 py-3 text-left font-medium">Account</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Requested</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.profiles?.[0]?.username ?? row.user_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    ₦{(row.amount / 100).toLocaleString('en-NG')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.destination?.bank_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.destination?.account_number ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${STATUS_BADGE[row.status] ?? ''}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString('en-NG')}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                          onClick={() => {
                            setSelected(row);
                            setDialogType('approve');
                            setNote('');
                            setError('');
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => {
                            setSelected(row);
                            setDialogType('reject');
                            setNote('');
                            setError('');
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setDialogType(null); }}>
        <DialogContent className="border-white/8 bg-brand-surface">
          <DialogHeader>
            <DialogTitle className="font-syne text-foreground">
              {dialogType === 'approve' ? 'Approve' : 'Reject'} withdrawal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="admin-note">Admin note (required, min 5 characters)</Label>
            <textarea
              id="admin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Reason for this decision…"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setDialogType(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={submitting}
              className={dialogType === 'approve' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}
            >
              {submitting ? 'Saving…' : dialogType === 'approve' ? 'Confirm approve' : 'Confirm reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
