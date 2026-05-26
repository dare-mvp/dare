'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type UserRow = {
  id: string;
  username: string;
  account_status: string;
  kyc_tier: string | null;
  trust_score: number | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  frozen: 'bg-red-500/20 text-red-400',
  suspended: 'bg-yellow-500/20 text-yellow-400',
};

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);

  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(
    async (query: string, pageNum: number) => {
      const supabase = createClient();
      setLoading(true);
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let req = supabase
        .from('profiles')
        .select('id, username, account_status, kyc_tier, trust_score, created_at', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (query.trim()) {
        req = req.ilike('username', `%${query.trim()}%`);
      }

      const { data, count } = await req;
      setRows((data as UserRow[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    const handler = setTimeout(() => fetchUsers(search, page), 300);
    return () => clearTimeout(handler);
  }, [search, page, fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search by username…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          router.push('/admin/users?page=1');
        }}
        className="max-w-xs bg-brand-surface border-white/8"
      />

      <div className="rounded-xl border border-white/8 bg-brand-surface overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/8 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Username</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">KYC tier</th>
                <th className="px-4 py-3 text-left font-medium">Trust score</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-white/3"
                  onClick={() => router.push(`/admin/users/${row.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{row.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium ${STATUS_BADGE[row.account_status] ?? 'bg-white/10 text-muted-foreground'}`}
                    >
                      {row.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.kyc_tier ?? 'none'}
                  </td>
                  <td className="px-4 py-3 text-foreground">{row.trust_score ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString('en-NG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => router.push(`/admin/users?page=${page - 1}`)}
        >
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => router.push(`/admin/users?page=${page + 1}`)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
