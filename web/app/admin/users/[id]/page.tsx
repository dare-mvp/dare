import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { FreezeUserButton } from './freeze-button';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const adminClient = createAdminClient();

  const [profileResult, walletResult] = await Promise.all([
    adminClient
      .from('profiles')
      .select(
        'id, username, display_name, bio, avatar_url, avatar_emoji, avatar_color, jury_categories, account_status, kyc_tier, trust_score, created_at',
      )
      .eq('id', id)
      .single(),
    adminClient
      .from('wallet_summary')
      .select('available_balance, escrowed_balance, pending_withdrawal_balance')
      .eq('user_id', id)
      .single(),
  ]);

  if (profileResult.error?.code === 'PGRST116' || !profileResult.data) {
    notFound();
  }

  const profile = profileResult.data;
  const wallet = walletResult.data;

  const formatNGN = (kobo: number | null) =>
    kobo != null ? `₦${(kobo / 100).toLocaleString('en-NG')}` : '—';

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to users
      </Link>

      <div className="rounded-xl border border-white/8 bg-brand-surface p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl"
            style={{ backgroundColor: profile.avatar_color ?? '#1a1a2e' }}
          >
            {profile.avatar_emoji ?? '👤'}
          </div>
          <div className="space-y-0.5">
            <h2 className="font-syne text-xl font-extrabold text-foreground">
              {profile.display_name ?? profile.username}
            </h2>
            <p className="font-mono text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-white/8 pt-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Account status</p>
            <p className="font-medium text-foreground capitalize">{profile.account_status}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">KYC tier</p>
            <p className="font-mono text-foreground">{profile.kyc_tier ?? 'none'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trust score</p>
            <p className="text-foreground">{profile.trust_score ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="font-mono text-xs text-foreground">
              {new Date(profile.created_at).toLocaleDateString('en-NG')}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-brand-surface p-6 space-y-3">
        <h3 className="font-syne text-lg font-extrabold text-foreground">Wallet</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="font-semibold text-foreground">{formatNGN(wallet?.available_balance ?? null)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Escrowed</p>
            <p className="font-semibold text-foreground">{formatNGN(wallet?.escrowed_balance ?? null)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending withdrawal</p>
            <p className="font-semibold text-foreground">{formatNGN(wallet?.pending_withdrawal_balance ?? null)}</p>
          </div>
        </div>
      </div>

      {profile.account_status !== 'frozen' && (
        <FreezeUserButton userId={id} username={profile.username} />
      )}
    </div>
  );
}
