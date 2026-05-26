import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin-auth';
import { FreezeDialog } from './freeze-dialog';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  frozen: 'bg-red-500/20 text-red-400',
  limited: 'bg-orange-500/20 text-orange-400',
  banned: 'bg-white/10 text-muted-foreground',
  closed: 'bg-white/10 text-muted-foreground',
};

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  jury_categories: string[] | null;
  account_status: string;
  kyc_tier: string | null;
  trust_score: number | null;
  created_at: string;
};

type WalletSummary = {
  available_balance: number;
  escrowed_balance: number;
  pending_withdrawal_balance: number;
} | null;

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  const admin = createAdminClient();

  const [profileResult, walletResult] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, username, display_name, bio, avatar_url, avatar_emoji, avatar_color, jury_categories, account_status, kyc_tier, trust_score, created_at',
      )
      .eq('id', id)
      .single(),
    admin
      .from('wallet_summary')
      .select('available_balance, escrowed_balance, pending_withdrawal_balance')
      .eq('user_id', id)
      .maybeSingle(),
  ]);

  if (!profileResult.data) {
    notFound();
  }

  const profile = profileResult.data as Profile;
  const wallet = walletResult.data as WalletSummary;

  function formatNGN(kobo: number | null | undefined) {
    if (kobo == null) return '—';
    return `₦${(kobo / 100).toLocaleString('en-NG')}`;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-white/8 bg-brand-surface p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
            style={{ backgroundColor: profile.avatar_color ?? '#1a1a2e' }}
          >
            {profile.avatar_emoji ?? profile.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-syne text-lg font-extrabold text-foreground">
              {profile.display_name ?? profile.username}
            </p>
            <p className="font-mono text-xs text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
        {profile.bio && (
          <p className="text-sm text-muted-foreground">{profile.bio}</p>
        )}
        {profile.jury_categories && profile.jury_categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.jury_categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center rounded-full bg-brand-primary/10 px-2 py-0.5 font-mono text-xs text-brand-primary"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
        <p className="font-mono text-xs text-muted-foreground">
          Joined {new Date(profile.created_at).toLocaleDateString('en-NG')}
        </p>
      </div>

      <div className="rounded-xl border border-white/8 bg-brand-surface p-6">
        <h2 className="mb-4 font-syne text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
          Account status
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-xs font-medium ${
              STATUS_BADGE[profile.account_status] ?? 'bg-white/10 text-muted-foreground'
            }`}
          >
            {profile.account_status}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-medium text-muted-foreground">
            KYC: {profile.kyc_tier ?? 'none'}
          </span>
          <span className="text-sm text-foreground">
            Trust score: <strong>{profile.trust_score ?? '—'}</strong>
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-brand-surface p-6">
        <h2 className="mb-4 font-syne text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
          Wallet
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="font-syne text-lg font-extrabold text-foreground">
              {formatNGN(wallet?.available_balance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Escrowed</p>
            <p className="font-syne text-lg font-extrabold text-foreground">
              {formatNGN(wallet?.escrowed_balance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending withdrawal</p>
            <p className="font-syne text-lg font-extrabold text-foreground">
              {formatNGN(wallet?.pending_withdrawal_balance)}
            </p>
          </div>
        </div>
      </div>

      {profile.account_status !== 'frozen' && (
        <div className="rounded-xl border border-white/8 bg-brand-surface p-6">
          <h2 className="mb-4 font-syne text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
            Actions
          </h2>
          <FreezeDialog userId={profile.id} />
        </div>
      )}
    </div>
  );
}
