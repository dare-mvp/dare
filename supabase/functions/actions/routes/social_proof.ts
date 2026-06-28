import {
  type QueryResponse,
  type SupabaseActionClient,
} from "../_shared/supabase.ts";
import { mapDareQueryError } from "./dare_errors.ts";

type DareActivityRow = {
  category: string | null;
  challenger_id: string | null;
  completed_at: string | null;
  created_at: string;
  currency: "NGN";
  dare_type: "skill" | "task" | null;
  funding_model: "two_sided_stake" | "darer_reward" | null;
  id: string;
  issuer_id: string;
  settled_at: string | null;
  status: string;
  title: string | null;
  winner_id: string | null;
};

type LedgerActivityRow = {
  amount: number;
  created_at: string;
  dare_id: string | null;
  status: string;
  type: "escrow_release" | "payout" | "platform_fee" | string;
};

type LiveCourtRoomRow = {
  dare_id: string;
  id: string;
  status: "cancelled" | "created" | "ended" | "live" | string;
  updated_at: string;
};

type LiveCourtParticipantRow = {
  connection_status: "joined" | "left" | "reconnecting" | string;
  dare_id: string;
  live_court_room_id: string;
  role: "participant_a" | "participant_b" | "spectator" | string;
};

type PublicProfileRow = {
  account_status?: string | null;
  display_name: string | null;
  id: string;
  tier: string | null;
  trust_score: number | null;
  username: string | null;
};

export type SocialProofActivityResponse = {
  generatedAt: string;
  summary: {
    activeCourts: number;
    completedDares: number;
    confirmedPayouts: number;
    openDares: number;
    topCategory: string | null;
    topTrustedPlayer: {
      name: string;
      score: number;
    } | null;
  };
  recentSettlements: Array<{
    amountLabel: string | null;
    dareId: string;
    label: "Payout confirmed" | "Refund confirmed" | "Settlement confirmed";
    settledAt: string;
    title: string;
    winnerName: string | null;
  }>;
  liveCourts: Array<{
    dareId: string;
    spectatorCount: number;
    title: string;
    updatedAt: string;
  }>;
  source: "server";
};

export async function getSocialProofActivity(
  serviceClient: SupabaseActionClient,
): Promise<SocialProofActivityResponse> {
  const [dares, ledgerEntries, profiles, liveRooms, liveParticipants] =
    await Promise.all([
      readDares(serviceClient),
      readLedgerEntries(serviceClient),
      readProfiles(serviceClient),
      readLiveRooms(serviceClient),
      readLiveParticipants(serviceClient),
    ]);

  return buildSocialProofActivity({
    dares,
    generatedAt: new Date().toISOString(),
    ledgerEntries,
    liveParticipants,
    liveRooms,
    profiles,
  });
}

export function buildSocialProofActivity(params: {
  dares: DareActivityRow[];
  generatedAt: string;
  ledgerEntries: LedgerActivityRow[];
  liveParticipants: LiveCourtParticipantRow[];
  liveRooms: LiveCourtRoomRow[];
  profiles: PublicProfileRow[];
}): SocialProofActivityResponse {
  const profileById = new Map(params.profiles.map((profile) => [profile.id, profile]));
  const dareById = new Map(params.dares.map((dare) => [dare.id, dare]));
  const postedLedgerByDare = groupPostedLedgerEntries(params.ledgerEntries);
  const settledDares = params.dares
    .filter((dare) => dare.status === "settled" && Boolean(dare.settled_at))
    .sort((a, b) => Date.parse(b.settled_at ?? "") - Date.parse(a.settled_at ?? ""));
  const settledDareIds = new Set(settledDares.map((dare) => dare.id));
  const activeRooms = params.liveRooms
    .filter((room) => room.status === "live" && dareById.has(room.dare_id))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  const categoryCounts = countCategories(params.dares);

  return {
    generatedAt: params.generatedAt,
    liveCourts: activeRooms.slice(0, 3).map((room) => {
      const dare = dareById.get(room.dare_id)!;
      return {
        dareId: room.dare_id,
        spectatorCount: countSpectators(params.liveParticipants, room.id),
        title: safeTitle(dare.title),
        updatedAt: room.updated_at,
      };
    }),
    recentSettlements: settledDares.slice(0, 5).map((dare) => {
      const posted = postedLedgerByDare.get(dare.id) ?? [];
      const payoutAmount = sumLedger(posted, "payout");
      const refundAmount = sumLedger(posted, "escrow_release");
      return {
        amountLabel: getAmountLabel(payoutAmount || refundAmount, dare.currency),
        dareId: dare.id,
        label: payoutAmount > 0
          ? "Payout confirmed"
          : refundAmount > 0
          ? "Refund confirmed"
          : "Settlement confirmed",
        settledAt: dare.settled_at!,
        title: safeTitle(dare.title),
        winnerName: dare.winner_id ? getPublicName(profileById.get(dare.winner_id)) : null,
      };
    }),
    source: "server",
    summary: {
      activeCourts: activeRooms.length,
      completedDares: settledDares.length,
      confirmedPayouts: params.ledgerEntries.filter((entry) =>
        entry.dare_id &&
        settledDareIds.has(entry.dare_id) &&
        entry.status === "posted" &&
        entry.type === "payout" &&
        nonNegativeInteger(entry.amount) > 0
      ).length,
      openDares: params.dares.filter((dare) => dare.status === "open").length,
      topCategory: getTopCategory(categoryCounts),
      topTrustedPlayer: getTopTrustedPlayer(params.profiles),
    },
  };
}

async function readDares(serviceClient: SupabaseActionClient) {
  const rows = await selectMany<DareActivityRow>(
    serviceClient
      .from<DareActivityRow>("dares")
      .select(
        "id,title,category,status,dare_type,funding_model,currency,winner_id,issuer_id,challenger_id,created_at,completed_at,settled_at",
      ),
  );

  return rows.filter((row) => isPublicDareStatus(row.status));
}

async function readLedgerEntries(serviceClient: SupabaseActionClient) {
  return selectMany<LedgerActivityRow>(
    serviceClient
      .from<LedgerActivityRow>("ledger_entries")
      .select("dare_id,type,status,amount,created_at"),
  );
}

async function readProfiles(serviceClient: SupabaseActionClient) {
  return selectMany<PublicProfileRow>(
    serviceClient
      .from<PublicProfileRow>("profiles")
      .select("id,username,display_name,trust_score,tier,account_status"),
  );
}

async function readLiveRooms(serviceClient: SupabaseActionClient) {
  return selectMany<LiveCourtRoomRow>(
    serviceClient
      .from<LiveCourtRoomRow>("live_court_rooms")
      .select("id,dare_id,status,updated_at"),
  );
}

async function readLiveParticipants(serviceClient: SupabaseActionClient) {
  return selectMany<LiveCourtParticipantRow>(
    serviceClient
      .from<LiveCourtParticipantRow>("live_court_participants")
      .select("live_court_room_id,dare_id,role,connection_status"),
  );
}

async function selectMany<T>(builder: unknown): Promise<T[]> {
  const { data, error } = (await builder) as QueryResponse<T[]>;
  if (error) throw mapDareQueryError(error);
  return Array.isArray(data) ? data : [];
}

function isPublicDareStatus(status: string) {
  return [
    "active",
    "awaiting_result",
    "completed",
    "open",
    "settled",
    "settlement_pending",
  ].includes(status);
}

function groupPostedLedgerEntries(rows: LedgerActivityRow[]) {
  const byDare = new Map<string, LedgerActivityRow[]>();
  for (const row of rows) {
    if (!row.dare_id || row.status !== "posted") continue;
    byDare.set(row.dare_id, [...(byDare.get(row.dare_id) ?? []), row]);
  }
  return byDare;
}

function countCategories(rows: DareActivityRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const category = typeof row.category === "string" ? row.category.trim() : "";
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return counts;
}

function getTopCategory(counts: Map<string, number>) {
  let topCategory: string | null = null;
  let topCount = 0;
  for (const [category, count] of counts.entries()) {
    if (count > topCount) {
      topCategory = category;
      topCount = count;
    }
  }
  return topCategory;
}

function getTopTrustedPlayer(profiles: PublicProfileRow[]) {
  const topProfile = profiles
    .filter((profile) =>
      isPublicProfile(profile) &&
      Number.isFinite(profile.trust_score) &&
      profile.username !== "dare_platform"
    )
    .sort((a, b) => nonNegativeInteger(b.trust_score) - nonNegativeInteger(a.trust_score))[0];
  if (!topProfile) return null;

  return {
    name: getPublicName(topProfile),
    score: nonNegativeInteger(topProfile.trust_score),
  };
}

function countSpectators(rows: LiveCourtParticipantRow[], roomId: string) {
  return rows.filter((row) =>
    row.live_court_room_id === roomId &&
    row.role === "spectator" &&
    row.connection_status === "joined"
  ).length;
}

function sumLedger(rows: LedgerActivityRow[], type: LedgerActivityRow["type"]) {
  return rows
    .filter((row) => row.type === type && row.status === "posted")
    .reduce((total, row) => total + nonNegativeInteger(row.amount), 0);
}

function getPublicName(profile: PublicProfileRow | undefined) {
  if (!profile || !isPublicProfile(profile)) return "DARE player";

  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName.slice(0, 40);

  const username = profile?.username?.trim();
  if (username) return username.slice(0, 40);

  return "DARE player";
}

function isPublicProfile(profile: PublicProfileRow) {
  return !profile.account_status || profile.account_status === "active";
}

function getAmountLabel(amount: number, currency: "NGN") {
  const safeAmount = nonNegativeInteger(amount);
  if (safeAmount <= 0) return null;

  return `${currency} ${Math.round(safeAmount / 100).toLocaleString("en-NG")}`;
}

function safeTitle(title: string | null) {
  const value = title?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!value) return "DARE challenge";
  return value.slice(0, 90);
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.trunc(number));
}
