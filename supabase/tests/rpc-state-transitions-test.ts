import { assert, assertEquals, assertRejects } from "@std/assert";
import postgres from "postgres";

const dbUrl = Deno.env.get("SUPABASE_DB_URL") ??
  "postgres://postgres:postgres@127.0.0.1:54322/postgres";

type Sql = ReturnType<typeof postgres>;

Deno.test("assign_jury_case_action randomizes blind packets and excludes colluding devices", async () => {
  const sql = createSql();
  const ids = idSet("10000000");
  const jurorIds = Array.from(
    { length: 40 },
    (_, index) =>
      uuid(`20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  );
  const badJurorId = uuid("30000000-0000-4000-8000-000000000001");
  const pairedJurorA = uuid("30000000-0000-4000-8000-000000000002");
  const pairedJurorB = uuid("30000000-0000-4000-8000-000000000003");
  const userIds = [
    ids.admin,
    ids.issuer,
    ids.challenger,
    badJurorId,
    pairedJurorA,
    pairedJurorB,
    ...jurorIds,
  ];

  try {
    await cleanup(sql, userIds);
    await createProfile(sql, ids.admin, "admin_gap7", {
      isAdmin: true,
      completedDares: 20,
      trustScore: 800,
    });
    await createProfile(sql, ids.issuer, "issuer_gap7");
    await createProfile(sql, ids.challenger, "challenger_gap7");
    await createProfile(sql, badJurorId, "bad_juror_gap7", {
      juryOptIn: true,
      completedDares: 20,
      trustScore: 800,
    });
    await createProfile(sql, pairedJurorA, "pair_a_gap7", {
      juryOptIn: true,
      completedDares: 20,
      trustScore: 800,
    });
    await createProfile(sql, pairedJurorB, "pair_b_gap7", {
      juryOptIn: true,
      completedDares: 20,
      trustScore: 800,
    });
    for (const [index, jurorId] of jurorIds.entries()) {
      await createProfile(sql, jurorId, `juror_gap7_${index}`, {
        juryOptIn: true,
        completedDares: 20,
        trustScore: 800,
      });
    }

    await sql`
      insert into user_devices (user_id, device_fingerprint)
      values
        (${ids.issuer}, 'issuer-device'),
        (${badJurorId}, 'issuer-device'),
        (${pairedJurorA}, 'paired-device'),
        (${pairedJurorB}, 'paired-device')
    `;

    const mappings: string[] = [];
    const assignedJurors = new Set<string>();
    for (let index = 0; index < 10; index++) {
      const dareId = uuid(
        `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      );
      const juryCaseId = uuid(
        `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      );
      await createDisputedDare(sql, dareId, ids.issuer, ids.challenger);
      await createJuryCase(sql, juryCaseId, dareId, ids.challenger);

      await sql`
        select *
        from assign_jury_case_action(${ids.admin}, ${juryCaseId}, 3)
      `;
      const rows = await sql<{ juror_id: string; mapping: string }[]>`
        select juror_id::text, blind_side_mapping::text as mapping
        from jury_assignments
        where jury_case_id = ${juryCaseId}
      `;

      assertEquals(rows.length, 3);
      const caseJurors = new Set<string>();
      for (const row of rows) {
        assignedJurors.add(row.juror_id);
        caseJurors.add(row.juror_id);
        mappings.push(row.mapping);
      }
      assert(!(caseJurors.has(pairedJurorA) && caseJurors.has(pairedJurorB)));
    }

    assert(!assignedJurors.has(badJurorId));
    assert(mappings.some((mapping) => mapping.includes('"A": "issuer"')));
    assert(mappings.some((mapping) => mapping.includes('"A": "challenger"')));
  } finally {
    await cleanup(sql, userIds);
    await sql.end();
  }
});

Deno.test("ready_dare_action rejects ready-up when either participant is kyc0", async () => {
  const sql = createSql();
  const ids = idSet("60000000");
  const dareId = uuid("60000000-0000-4000-8000-000000000010");

  try {
    await cleanup(sql, [ids.issuer, ids.challenger]);
    await createProfile(sql, ids.issuer, "issuer_gap9", { kycTier: "kyc0" });
    await createProfile(sql, ids.challenger, "challenger_gap9", {
      kycTier: "kyc1",
    });
    await createReadyDare(sql, dareId, ids.issuer, ids.challenger);

    await assertRejects(
      () => sql`select * from ready_dare_action(${ids.issuer}, ${dareId}, 5)`,
      Error,
      "kyc_required",
    );

    const [court] = await sql<{ player_a_ready: boolean }[]>`
      select player_a_ready
      from court_sessions
      where dare_id = ${dareId}
    `;
    assertEquals(court.player_a_ready, false);
  } finally {
    await cleanup(sql, [ids.issuer, ids.challenger]);
    await sql.end();
  }
});

Deno.test("update_responsible_gaming_settings_action blocks repeated limit increases during cooling-off", async () => {
  const sql = createSql();
  const ids = idSet("70000000");

  try {
    await cleanup(sql, [ids.issuer]);
    await createProfile(sql, ids.issuer, "issuer_gap10");
    await sql`
      insert into responsible_gaming_settings (
        user_id,
        daily_deposit_limit_kobo
      )
      values (${ids.issuer}, 100000)
      on conflict (user_id) do update
        set daily_deposit_limit_kobo = excluded.daily_deposit_limit_kobo,
            pending_daily_deposit_limit_kobo = null,
            pending_limits_effective_at = null
    `;

    const [first] = await sql<{
      daily_deposit_limit_kobo: number;
      pending_daily_deposit_limit_kobo: number;
      pending_limits_effective_at: Date;
    }[]>`
      select *
      from update_responsible_gaming_settings_action(
        ${ids.issuer},
        200000,
        null,
        null,
        null,
        null
      )
    `;
    assertEquals(first.daily_deposit_limit_kobo, 100000);
    assertEquals(first.pending_daily_deposit_limit_kobo, 200000);
    assert(first.pending_limits_effective_at instanceof Date);

    await assertRejects(
      () =>
        sql`
          select *
          from update_responsible_gaming_settings_action(
            ${ids.issuer},
            300000,
            null,
            null,
            null,
            null
          )
        `,
      Error,
      "cooling_off_active",
    );

    const [lowered] = await sql<{ daily_deposit_limit_kobo: number }[]>`
      select *
      from update_responsible_gaming_settings_action(
        ${ids.issuer},
        50000,
        null,
        null,
        null,
        null
      )
    `;
    assertEquals(lowered.daily_deposit_limit_kobo, 50000);
  } finally {
    await cleanup(sql, [ids.issuer]);
    await sql.end();
  }
});

Deno.test("signup profile provisioning creates wallet and required runtime objects exist", async () => {
  const sql = createSql();
  const ids = idSet("80000000");

  try {
    await cleanup(sql, [ids.issuer, ids.challenger]);
    await createProfile(sql, ids.issuer, "issuer_gap_wallet");

    const [wallet] = await sql<{ count: string }[]>`
      select count(*)::text
      from wallet_accounts
      where user_id = ${ids.issuer}
        and currency = 'NGN'
        and status = 'active'
    `;
    assertEquals(wallet.count, "1");

    const [depositTotals] = await sql<{
      daily_total_kobo: string;
      weekly_total_kobo: string;
      monthly_total_kobo: string;
    }[]>`
      select *
      from get_user_deposit_totals_kobo(${ids.issuer})
    `;
    assertEquals(depositTotals.daily_total_kobo, "0");
    assertEquals(depositTotals.weekly_total_kobo, "0");
    assertEquals(depositTotals.monthly_total_kobo, "0");

    const [idempotency] = await sql<{ exists: boolean }[]>`
      select to_regclass('public.idempotency_records') is not null as exists
    `;
    assertEquals(idempotency.exists, true);

    const [bucket] = await sql<{
      public: boolean;
      file_size_limit: string | null;
    }[]>`
      select public, file_size_limit::text
      from storage.buckets
      where id = 'dare-evidence'
    `;
    assertEquals(bucket.public, false);
    assertEquals(bucket.file_size_limit, "10485760");

    await sql`
      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      values (
        ${ids.challenger},
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'auth.trigger@example.com',
        crypt(gen_random_uuid()::text, gen_salt('bf')),
        now(),
        '{}',
        '{"display_name":"Auth Trigger"}',
        now(),
        now()
      )
    `;

    const [authProvisioning] = await sql<{
      display_name: string;
      has_responsible_gaming: boolean;
      has_wallet: boolean;
      username: string;
    }[]>`
      select
        p.username::text,
        p.display_name,
        exists (
          select 1 from wallet_accounts wa
          where wa.user_id = p.id
            and wa.currency = 'NGN'
            and wa.status = 'active'
        ) as has_wallet,
        exists (
          select 1 from responsible_gaming_settings rg
          where rg.user_id = p.id
        ) as has_responsible_gaming
      from profiles p
      where p.id = ${ids.challenger}
    `;
    assertEquals(authProvisioning.username, "auth_trigger");
    assertEquals(authProvisioning.display_name, "Auth Trigger");
    assertEquals(authProvisioning.has_wallet, true);
    assertEquals(authProvisioning.has_responsible_gaming, true);
  } finally {
    await cleanup(sql, [ids.issuer, ids.challenger]);
    await sql.end();
  }
});

Deno.test("settle_dare_action deducts platform fee and credits platform wallet", async () => {
  const sql = createSql();
  const ids = idSet("90000000");
  const dareId = uuid("90000000-0000-4000-8000-000000000010");

  try {
    await cleanup(sql, [ids.issuer, ids.challenger]);
    await createProfile(sql, ids.issuer, "issuer_gap_fee");
    await createProfile(sql, ids.challenger, "challenger_gap_fee");
    await createCompletedDareWithEscrow(
      sql,
      dareId,
      ids.issuer,
      ids.challenger,
    );

    const [result] = await sql<{
      payout_amount: number;
      ledger_entries_created: number;
    }[]>`
      select payout_amount, ledger_entries_created
      from settle_dare_action(${ids.issuer}, ${dareId})
    `;
    assertEquals(result.payout_amount, 95000);
    assertEquals(result.ledger_entries_created, 2);

    const entries = await sql<{ type: string; amount: number }[]>`
      select type, amount
      from ledger_entries
      where dare_id = ${dareId}
        and type in ('payout', 'platform_fee')
      order by type
    `;
    assertEquals([...entries], [
      { type: "payout", amount: 95000 },
      { type: "platform_fee", amount: 5000 },
    ]);

    const [dare] = await sql<{
      status: string;
      platform_fee: number;
      winner_payout: number;
    }[]>`
      select status, platform_fee, winner_payout
      from dares
      where id = ${dareId}
    `;
    assertEquals(dare.status, "settled");
    assertEquals(dare.platform_fee, 5000);
    assertEquals(dare.winner_payout, 95000);

    const [second] = await sql<{
      payout_amount: number;
      ledger_entries_created: number;
    }[]>`
      select payout_amount, ledger_entries_created
      from settle_dare_action(${ids.issuer}, ${dareId})
    `;
    assertEquals(second.payout_amount, 95000);
    assertEquals(second.ledger_entries_created, 0);

    const [entryCount] = await sql<{ count: string }[]>`
      select count(*)::text
      from ledger_entries
      where dare_id = ${dareId}
        and type in ('payout', 'platform_fee')
    `;
    assertEquals(entryCount.count, "2");

    const [winner] = await sql<{ wins: number }[]>`
      select wins
      from profiles
      where id = ${ids.issuer}
    `;
    assertEquals(winner.wins, 1);
  } finally {
    await cleanup(sql, [ids.issuer, ids.challenger]);
    await sql.end();
  }
});

Deno.test("action rate limit RPC enforces windows and required cron jobs are active", async () => {
  const sql = createSql();
  const ids = idSet("91000000");

  try {
    await cleanup(sql, [ids.issuer]);
    await createProfile(sql, ids.issuer, "issuer_gap_rate");

    const first = await sql<{ allowed: boolean; remaining: number }[]>`
      select allowed, remaining
      from consume_action_rate_limit(${ids.issuer}, 'test_scope:minute', 2, 60)
    `;
    const second = await sql<{ allowed: boolean; remaining: number }[]>`
      select allowed, remaining
      from consume_action_rate_limit(${ids.issuer}, 'test_scope:minute', 2, 60)
    `;
    const third = await sql<{
      allowed: boolean;
      remaining: number;
      retry_after_seconds: number;
    }[]>`
      select allowed, remaining, retry_after_seconds
      from consume_action_rate_limit(${ids.issuer}, 'test_scope:minute', 2, 60)
    `;

    assertEquals(first[0].allowed, true);
    assertEquals(first[0].remaining, 1);
    assertEquals(second[0].allowed, true);
    assertEquals(second[0].remaining, 0);
    assertEquals(third[0].allowed, false);
    assertEquals(third[0].remaining, 0);
    assert(third[0].retry_after_seconds > 0);

    const jobs = await sql<{ job_name: string; active: boolean }[]>`
      select job_name, active
      from verify_required_cron_jobs()
    `;
    assertEquals(jobs.length, 6);
    for (const job of jobs) {
      assertEquals(job.active, true, `${job.job_name} should be active`);
    }
  } finally {
    await cleanup(sql, [ids.issuer]);
    await sql.end();
  }
});

Deno.test("jury votes are immutable and DARE participants cannot be assigned", async () => {
  const sql = createSql();
  const ids = idSet("92000000");
  const jurorId = uuid("92000000-0000-4000-8000-000000000004");
  const dareId = uuid("92000000-0000-4000-8000-000000000010");
  const juryCaseId = uuid("92000000-0000-4000-8000-000000000011");

  try {
    await cleanup(sql, [ids.issuer, ids.challenger, jurorId]);
    await createProfile(sql, ids.issuer, "issuer_gap_jury_guard");
    await createProfile(sql, ids.challenger, "challenger_gap_jury_guard");
    await createProfile(sql, jurorId, "juror_gap_jury_guard", {
      juryOptIn: true,
      completedDares: 20,
      trustScore: 800,
    });
    await createDisputedDare(sql, dareId, ids.issuer, ids.challenger);
    await createJuryCase(sql, juryCaseId, dareId, ids.challenger);

    await assertRejects(
      () =>
        sql`
          insert into jury_assignments (jury_case_id, juror_id, status)
          values (${juryCaseId}, ${ids.issuer}, 'assigned')
        `,
      Error,
      "jury_participant_not_allowed",
    );

    await sql`
      insert into jury_assignments (jury_case_id, juror_id, status)
      values (${juryCaseId}, ${jurorId}, 'assigned')
    `;
    const [vote] = await sql<{ id: string }[]>`
      insert into jury_votes (jury_case_id, juror_id, vote, rationale)
      values (${juryCaseId}, ${jurorId}, 'A', 'This is a sufficiently detailed rationale.')
      returning id::text
    `;

    await assertRejects(
      () =>
        sql`
          update jury_votes
          set rationale = 'This attempted update should be blocked.'
          where id = ${vote.id}
        `,
      Error,
      "jury_votes rows are immutable",
    );
    await assertRejects(
      () => sql`delete from jury_votes where id = ${vote.id}`,
      Error,
      "jury_votes rows are immutable",
    );
  } finally {
    await cleanup(sql, [ids.issuer, ids.challenger, jurorId]);
    await sql.end();
  }
});

Deno.test("completed withdrawal requests no longer reserve pending balance", async () => {
  const sql = createSql();
  const ids = idSet("93000000");

  try {
    await cleanup(sql, [ids.issuer]);
    await createProfile(sql, ids.issuer, "issuer_gap_wd_proj");
    const [wallet] = await sql<{ id: string }[]>`
      select id::text
      from wallet_accounts
      where user_id = ${ids.issuer}
        and currency = 'NGN'
    `;
    const ledgerId = uuid("93000000-0000-4000-8000-000000000010");
    const withdrawalId = uuid("93000000-0000-4000-8000-000000000011");

    await sql`
      insert into ledger_entries (
        id,
        wallet_account_id,
        user_id,
        type,
        direction,
        amount,
        currency,
        status,
        idempotency_key
      )
      values (
        ${ledgerId},
        ${wallet.id},
        ${ids.issuer},
        'withdrawal_pending',
        'debit',
        10000,
        'NGN',
        'pending',
        'withdrawal_projection_test'
      )
    `;
    await sql`
      insert into withdrawal_requests (
        id,
        user_id,
        wallet_account_id,
        amount,
        currency,
        bank_code,
        account_number,
        account_name,
        provider,
        provider_transfer_reference,
        status,
        ledger_entry_id
      )
      values (
        ${withdrawalId},
        ${ids.issuer},
        ${wallet.id},
        10000,
        'NGN',
        '058',
        'acct_token_projection',
        'Ada Lovelace',
        'paystack',
        'projection_reference',
        'processing',
        ${ledgerId}
      )
    `;

    const [processing] = await sql<{ pending_withdrawal_balance: number }[]>`
      select pending_withdrawal_balance
      from wallet_summary
      where wallet_account_id = ${wallet.id}
    `;
    assertEquals(Number(processing.pending_withdrawal_balance), 10000);

    await sql`
      update withdrawal_requests
      set status = 'completed'
      where id = ${withdrawalId}
    `;

    const [completed] = await sql<{ pending_withdrawal_balance: number }[]>`
      select pending_withdrawal_balance
      from wallet_summary
      where wallet_account_id = ${wallet.id}
    `;
    assertEquals(Number(completed.pending_withdrawal_balance), 0);
  } finally {
    await cleanup(sql, [ids.issuer]);
    await sql.end();
  }
});

Deno.test("claim_paystack_withdrawals only claims admin-approved withdrawals", async () => {
  const sql = createSql();
  const ids = idSet("94000000");

  try {
    await cleanup(sql, [ids.issuer]);
    await createProfile(sql, ids.issuer, "issuer_gap_wd_claim");
    const [wallet] = await sql<{ id: string }[]>`
      select id::text
      from wallet_accounts
      where user_id = ${ids.issuer}
        and currency = 'NGN'
    `;
    const ledgerId = uuid("94000000-0000-4000-8000-000000000010");
    const withdrawalId = uuid("94000000-0000-4000-8000-000000000011");

    await sql`
      insert into ledger_entries (
        id,
        wallet_account_id,
        user_id,
        type,
        direction,
        amount,
        currency,
        status,
        idempotency_key
      )
      values (
        ${ledgerId},
        ${wallet.id},
        ${ids.issuer},
        'withdrawal_pending',
        'debit',
        10000,
        'NGN',
        'pending',
        'withdrawal_claim_test'
      )
    `;
    await sql`
      insert into withdrawal_requests (
        id,
        user_id,
        wallet_account_id,
        amount,
        currency,
        bank_code,
        account_number,
        account_name,
        status,
        ledger_entry_id
      )
      values (
        ${withdrawalId},
        ${ids.issuer},
        ${wallet.id},
        10000,
        'NGN',
        '058',
        '0123456789',
        'Ada Lovelace',
        'pending',
        ${ledgerId}
      )
    `;

    const unapproved = await sql`
      select *
      from claim_paystack_withdrawals(1)
    `;
    assertEquals(unapproved.length, 0);

    await sql`
      update withdrawal_requests
      set status = 'approved'
      where id = ${withdrawalId}
    `;

    const [claimed] = await sql<{
      withdrawal_request_id: string;
      provider_transfer_reference: string;
      retry_count: number;
    }[]>`
      select withdrawal_request_id::text, provider_transfer_reference, retry_count
      from claim_paystack_withdrawals(1)
    `;
    assertEquals(claimed.withdrawal_request_id, withdrawalId);
    assertEquals(
      claimed.provider_transfer_reference,
      "wd_94000000000040008000000000000011",
    );
    assertEquals(claimed.retry_count, 1);

    const [row] = await sql<{ status: string; provider: string }[]>`
      select status, provider
      from withdrawal_requests
      where id = ${withdrawalId}
    `;
    assertEquals(row.status, "processing");
    assertEquals(row.provider, "paystack");

    const second = await sql`
      select *
      from claim_paystack_withdrawals(1)
    `;
    assertEquals(second.length, 0);
  } finally {
    await cleanup(sql, [ids.issuer]);
    await sql.end();
  }
});

Deno.test("accept_dare_action allows only one challenger under concurrent accepts", async () => {
  const sql = createSql();
  const sqlA = createSql();
  const sqlB = createSql();
  const ids = idSet("95000000");
  const challengerB = uuid("95000000-0000-4000-8000-000000000004");
  const dareId = uuid("95000000-0000-4000-8000-000000000010");
  const userIds = [ids.issuer, ids.challenger, challengerB];

  try {
    await cleanup(sql, userIds);
    await createProfile(sql, ids.issuer, "issuer_accept_race");
    await createProfile(sql, ids.challenger, "challenger_a_race");
    await createProfile(sql, challengerB, "challenger_b_race");
    await creditWallet(sql, ids.challenger, 100000, "race_credit_a");
    await creditWallet(sql, challengerB, 100000, "race_credit_b");
    await createOpenDare(sql, dareId, ids.issuer, 50000);

    const attempts = await Promise.allSettled([
      sqlA`
        select *
        from accept_dare_action(${ids.challenger}, ${dareId}, 'accept-race-a')
      `,
      sqlB`
        select *
        from accept_dare_action(${challengerB}, ${dareId}, 'accept-race-b')
      `,
    ]);

    const fulfilled = attempts.filter((result) =>
      result.status === "fulfilled"
    );
    const rejected = attempts.filter((result) => result.status === "rejected");
    assertEquals(fulfilled.length, 1);
    assertEquals(rejected.length, 1);
    assert(
      String((rejected[0] as PromiseRejectedResult).reason).includes(
        "dare_not_acceptable",
      ),
    );

    const [dare] = await sql<{ status: string; challenger_id: string }[]>`
      select status, challenger_id::text
      from dares
      where id = ${dareId}
    `;
    assertEquals(dare.status, "ready_check");
    assert([ids.challenger, challengerB].includes(dare.challenger_id));

    const [courtCount] = await sql<{ count: string }[]>`
      select count(*)::text
      from court_sessions
      where dare_id = ${dareId}
    `;
    assertEquals(courtCount.count, "1");

    const [challengerHolds] = await sql<{ count: string }[]>`
      select count(*)::text
      from escrow_holds
      where dare_id = ${dareId}
        and user_id in (${ids.challenger}, ${challengerB})
        and status = 'held'
    `;
    assertEquals(challengerHolds.count, "1");
  } finally {
    await cleanup(sql, userIds);
    await sqlA.end();
    await sqlB.end();
    await sql.end();
  }
});

Deno.test("self_exclude_action cancels open DAREs and restores escrowed wallet balance", async () => {
  const sql = createSql();
  const ids = idSet("96000000");
  const dareId = uuid("96000000-0000-4000-8000-000000000010");

  try {
    await cleanup(sql, [ids.issuer]);
    await createProfile(sql, ids.issuer, "issuer_self_exclude_wallet");
    await creditWallet(sql, ids.issuer, 50000, "self_exclude_credit");
    await createOpenDareWithIssuerEscrow(sql, dareId, ids.issuer, 20000);

    const [before] = await sql<{ available_balance: number }[]>`
      select available_balance
      from wallet_summary
      where user_id = ${ids.issuer}
    `;
    assertEquals(Number(before.available_balance), 30000);

    const [result] = await sql<{
      account_status: string;
      cancelled_dares: number;
      forfeited_dares: number;
      refunded_amount: number;
    }[]>`
      select account_status, cancelled_dares, forfeited_dares, refunded_amount
      from self_exclude_action(${ids.issuer}, 30, 'Integration self-exclusion test', 'self-exclude-wallet')
    `;
    assertEquals(result.account_status, "limited");
    assertEquals(result.cancelled_dares, 1);
    assertEquals(result.forfeited_dares, 0);
    assertEquals(result.refunded_amount, 20000);

    const [after] = await sql<{ available_balance: number }[]>`
      select available_balance
      from wallet_summary
      where user_id = ${ids.issuer}
    `;
    assertEquals(Number(after.available_balance), 50000);

    const [hold] = await sql<{ status: string }[]>`
      select status
      from escrow_holds
      where dare_id = ${dareId}
        and user_id = ${ids.issuer}
    `;
    assertEquals(hold.status, "refunded");

    const [refund] = await sql<{ count: string }[]>`
      select count(*)::text
      from ledger_entries
      where dare_id = ${dareId}
        and type = 'escrow_release'
        and status = 'posted'
    `;
    assertEquals(refund.count, "1");
  } finally {
    await cleanup(sql, [ids.issuer]);
    await sql.end();
  }
});

function createSql(): Sql {
  return postgres(dbUrl, { max: 1 });
}

function idSet(prefix: string): {
  admin: string;
  issuer: string;
  challenger: string;
} {
  return {
    admin: uuid(`${prefix}-0000-4000-8000-000000000001`),
    issuer: uuid(`${prefix}-0000-4000-8000-000000000002`),
    challenger: uuid(`${prefix}-0000-4000-8000-000000000003`),
  };
}

function uuid(value: string): string {
  return value;
}

async function createProfile(
  sql: Sql,
  id: string,
  username: string,
  options: {
    kycTier?: "kyc0" | "kyc1" | "kyc2" | "kyc3";
    juryOptIn?: boolean;
    completedDares?: number;
    trustScore?: number;
    isAdmin?: boolean;
  } = {},
): Promise<void> {
  await sql`
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      ${id},
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      ${`${username}@test.dare`},
      crypt('Password123', gen_salt('bf')),
      now(),
      '{}',
      '{}',
      now(),
      now()
    )
    on conflict (id) do update
      set email = excluded.email,
          updated_at = now()
  `;

  await sql`
    insert into profiles (
      id,
      username,
      display_name,
      kyc_tier,
      jury_opt_in,
      jury_categories,
      completed_dares,
      trust_score,
      is_admin,
      account_status,
      risk_status
    )
    values (
      ${id},
      ${username},
      ${username},
      ${options.kycTier ?? "kyc1"},
      ${options.juryOptIn ?? false},
      ARRAY['knowledge'],
      ${options.completedDares ?? 0},
      ${options.trustScore ?? 120},
      ${options.isAdmin ?? false},
      'active',
      'normal'
    )
    on conflict (id) do update
      set username = excluded.username,
          display_name = excluded.display_name,
          kyc_tier = excluded.kyc_tier,
          jury_opt_in = excluded.jury_opt_in,
          jury_categories = excluded.jury_categories,
          completed_dares = excluded.completed_dares,
          trust_score = excluded.trust_score,
          is_admin = excluded.is_admin,
          account_status = excluded.account_status,
          risk_status = excluded.risk_status
  `;
}

async function createDisputedDare(
  sql: Sql,
  dareId: string,
  issuerId: string,
  challengerId: string,
): Promise<void> {
  await sql`
    insert into dares (
      id,
      issuer_id,
      challenger_id,
      title,
      category,
      resolution_type,
      status,
      stake_amount,
      currency,
      duration_seconds
    )
    values (
      ${dareId},
      ${issuerId},
      ${challengerId},
      'Integration DARE',
      'knowledge',
      'algorithmic',
      'dispute_pending',
      10000,
      'NGN',
      60
    )
  `;
}

async function createReadyDare(
  sql: Sql,
  dareId: string,
  issuerId: string,
  challengerId: string,
): Promise<void> {
  await sql`
    insert into dares (
      id,
      issuer_id,
      challenger_id,
      title,
      category,
      resolution_type,
      status,
      stake_amount,
      currency,
      duration_seconds
    )
    values (
      ${dareId},
      ${issuerId},
      ${challengerId},
      'Ready DARE',
      'knowledge',
      'algorithmic',
      'ready_check',
      10000,
      'NGN',
      60
    )
  `;
  await sql`
    insert into court_sessions (dare_id, phase)
    values (${dareId}, 'ready_check')
  `;
}

async function createCompletedDareWithEscrow(
  sql: Sql,
  dareId: string,
  issuerId: string,
  challengerId: string,
): Promise<void> {
  await sql`
    insert into dares (
      id,
      issuer_id,
      challenger_id,
      title,
      category,
      resolution_type,
      status,
      stake_amount,
      currency,
      platform_fee,
      winner_payout,
      winner_id,
      duration_seconds,
      completed_at,
      dispute_deadline_at
    )
    values (
      ${dareId},
      ${issuerId},
      ${challengerId},
      'Fee DARE',
      'knowledge',
      'algorithmic',
      'completed',
      50000,
      'NGN',
      5000,
      95000,
      ${issuerId},
      60,
      now(),
      now() - interval '1 minute'
    )
  `;
  await sql`
    insert into court_sessions (dare_id, phase)
    values (${dareId}, 'completed')
  `;

  const [issuerWallet] = await sql<{ id: string }[]>`
    select id::text
    from wallet_accounts
    where user_id = ${issuerId}
      and currency = 'NGN'
  `;
  const [challengerWallet] = await sql<{ id: string }[]>`
    select id::text
    from wallet_accounts
    where user_id = ${challengerId}
      and currency = 'NGN'
  `;

  await sql`
    insert into escrow_holds (
      dare_id,
      user_id,
      wallet_account_id,
      amount,
      currency,
      status,
      hold_reason
    )
    values
      (${dareId}, ${issuerId}, ${issuerWallet.id}, 50000, 'NGN', 'held', 'dare_active'),
      (${dareId}, ${challengerId}, ${challengerWallet.id}, 50000, 'NGN', 'held', 'dare_active')
  `;
}

async function createOpenDare(
  sql: Sql,
  dareId: string,
  issuerId: string,
  stakeAmount: number,
): Promise<void> {
  await sql`
    insert into dares (
      id,
      issuer_id,
      title,
      category,
      resolution_type,
      status,
      stake_amount,
      currency,
      duration_seconds
    )
    values (
      ${dareId},
      ${issuerId},
      'Open Integration DARE',
      'knowledge',
      'algorithmic',
      'open',
      ${stakeAmount},
      'NGN',
      60
    )
  `;
  const [constitution] = await sql<{ id: string }[]>`
    insert into dare_constitutions (
      dare_id,
      test,
      rules,
      proof_method,
      edge_cases,
      accepted_by_issuer_at
    )
    values (
      ${dareId},
      'Open Integration DARE',
      'Highest score wins. Ties are voided.',
      'algorithmic',
      'Server rules apply.',
      now()
    )
    returning id::text
  `;
  await sql`
    update dares
    set constitution_id = ${constitution.id}
    where id = ${dareId}
  `;
}

async function createOpenDareWithIssuerEscrow(
  sql: Sql,
  dareId: string,
  issuerId: string,
  stakeAmount: number,
): Promise<void> {
  await createOpenDare(sql, dareId, issuerId, stakeAmount);
  const [wallet] = await sql<{ id: string }[]>`
    select id::text
    from wallet_accounts
    where user_id = ${issuerId}
      and currency = 'NGN'
  `;
  const [ledger] = await sql<{ id: string }[]>`
    insert into ledger_entries (
      wallet_account_id,
      user_id,
      dare_id,
      type,
      direction,
      amount,
      currency,
      status,
      idempotency_key,
      metadata
    )
    values (
      ${wallet.id},
      ${issuerId},
      ${dareId},
      'escrow_hold',
      'debit',
      ${stakeAmount},
      'NGN',
      'posted',
      ${`open-escrow:${dareId}`},
      '{"role":"issuer"}'::jsonb
    )
    returning id::text
  `;
  await sql`
    insert into escrow_holds (
      dare_id,
      user_id,
      wallet_account_id,
      amount,
      currency,
      status,
      hold_reason,
      held_ledger_entry_id
    )
    values (
      ${dareId},
      ${issuerId},
      ${wallet.id},
      ${stakeAmount},
      'NGN',
      'held',
      'dare_active',
      ${ledger.id}
    )
  `;
}

async function creditWallet(
  sql: Sql,
  userId: string,
  amount: number,
  idempotencyKey: string,
): Promise<void> {
  const [wallet] = await sql<{ id: string }[]>`
    select id::text
    from wallet_accounts
    where user_id = ${userId}
      and currency = 'NGN'
  `;
  await sql`
    insert into ledger_entries (
      wallet_account_id,
      user_id,
      type,
      direction,
      amount,
      currency,
      status,
      idempotency_key,
      metadata
    )
    values (
      ${wallet.id},
      ${userId},
      'deposit_confirmed',
      'credit',
      ${amount},
      'NGN',
      'posted',
      ${idempotencyKey},
      '{"source":"integration_test"}'::jsonb
    )
  `;
}

async function createJuryCase(
  sql: Sql,
  juryCaseId: string,
  dareId: string,
  openedBy: string,
): Promise<void> {
  await sql`
    insert into jury_cases (
      id,
      dare_id,
      opened_by_user_id,
      status,
      reason,
      votes_needed
    )
    values (
      ${juryCaseId},
      ${dareId},
      ${openedBy},
      'filed',
      'Integration dispute reason',
      3
    )
  `;
}

async function cleanup(sql: Sql, userIds: string[]): Promise<void> {
  await sql`delete from notifications where user_id = any(${userIds}::uuid[])`;
  await sql`
    delete from trust_events
    where user_id = any(${userIds}::uuid[])
      or dare_id in (
        select id
        from dares
        where issuer_id = any(${userIds}::uuid[])
          or challenger_id = any(${userIds}::uuid[])
      )
  `;
  await sql`alter table jury_votes disable trigger trg_jury_vote_immutability`;
  try {
    await sql`delete from jury_votes where juror_id = any(${userIds}::uuid[])`;
  } finally {
    await sql`alter table jury_votes enable trigger trg_jury_vote_immutability`;
  }
  await sql`
    delete from jury_assignments
    where juror_id = any(${userIds}::uuid[])
      or jury_case_id in (
        select jc.id
        from jury_cases jc
        join dares d on d.id = jc.dare_id
        where jc.opened_by_user_id = any(${userIds}::uuid[])
          or d.issuer_id = any(${userIds}::uuid[])
          or d.challenger_id = any(${userIds}::uuid[])
      )
  `;
  await sql`
    delete from jury_cases
    where opened_by_user_id = any(${userIds}::uuid[])
      or dare_id in (
        select id
        from dares
        where issuer_id = any(${userIds}::uuid[])
          or challenger_id = any(${userIds}::uuid[])
      )
  `;
  await sql`
    delete from dare_quiz_answers
    where user_id = any(${userIds}::uuid[])
      or dare_id in (
        select id
        from dares
        where issuer_id = any(${userIds}::uuid[])
          or challenger_id = any(${userIds}::uuid[])
      )
  `;
  await sql`
    delete from dare_quiz_rounds
    where dare_id in (
      select id
      from dares
      where issuer_id = any(${userIds}::uuid[])
        or challenger_id = any(${userIds}::uuid[])
    )
  `;
  await sql`
    delete from court_sessions
    where dare_id in (
      select id
      from dares
      where issuer_id = any(${userIds}::uuid[])
        or challenger_id = any(${userIds}::uuid[])
    )
  `;
  await sql`
    delete from escrow_holds
    where user_id = any(${userIds}::uuid[])
      or dare_id in (
        select id
        from dares
        where issuer_id = any(${userIds}::uuid[])
          or challenger_id = any(${userIds}::uuid[])
      )
  `;
  await sql`
    delete from withdrawal_requests
    where user_id = any(${userIds}::uuid[])
  `;
  await sql`alter table ledger_entries disable trigger trg_ledger_immutability`;
  try {
    await sql`
      delete from ledger_entries
      where user_id = any(${userIds}::uuid[])
        or dare_id in (
          select id
          from dares
          where issuer_id = any(${userIds}::uuid[])
            or challenger_id = any(${userIds}::uuid[])
        )
    `;
  } finally {
    await sql`alter table ledger_entries enable trigger trg_ledger_immutability`;
  }
  await sql`
    delete from dares
    where issuer_id = any(${userIds}::uuid[])
      or challenger_id = any(${userIds}::uuid[])
  `;
  await sql`
    delete from responsible_gaming_settings
    where user_id = any(${userIds}::uuid[])
  `;
  await sql`
    delete from action_rate_limits
    where user_id = any(${userIds}::uuid[])
  `;
  await sql`delete from user_devices where user_id = any(${userIds}::uuid[])`;
  await sql`delete from wallet_accounts where user_id = any(${userIds}::uuid[])`;
  await sql`delete from profiles where id = any(${userIds}::uuid[])`;
  await sql`delete from auth.users where id = any(${userIds}::uuid[])`;
}
