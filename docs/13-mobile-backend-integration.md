# Mobile Backend Integration Notes

## Environment

The Expo app reads backend configuration from public Expo environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_ACTIONS_FUNCTION_URL`

`EXPO_PUBLIC_ACTIONS_FUNCTION_URL` is:

```text
https://<project-ref>.supabase.co/functions/v1/actions
```

Do not commit real keys to the repository. Use `mobile/.env.example` as the template.

## Current Client Boundary

The mobile app now has:

- nullable Supabase client setup with persisted auth sessions
- auth provider with preview, loading, authenticated, unauthenticated, and error states
- sign-in and sign-up methods backed by Supabase Auth when env vars are configured
- typed `actions` Edge Function request helper
- idempotency key helper for sensitive POST actions
- typed `GET /me` helper wired through feed, wallet, and profile summary surfaces
- capability gates wired into deposit, withdraw, create, accept, and court entry screens
- Supabase read hooks for `public_dare_feed` and the authenticated notifications inbox
- feed category/status filters applied client-side to the current feed result set
- Top Players widget derived from the current feed's player trust scores instead of a hardcoded list
- DARE detail, accept, and accept-receipt screens backed by `public_dare_feed` for live UUID DAREs
- transaction-detail read hook that loads real UUID ledger entries from `ledger_entries` with preview fallback
- KYC status screen derived from `GET /me` profile/KYC state with preview fallback
- KYC submit form uploads documents to private storage and sends `private_storage_v1` references to `POST /kyc/submit` with client validation and authenticated-session gating
- jury home summary using RLS-readable `jury_assignments` and `jury_votes` counts when authenticated
- jury assignment and vote screens read live `jury_assignments` / `jury_cases` and submit through `POST /jury-cases/{id}/votes`
- settings screen derived from account capability state instead of only static values
- profile edit screen populated from `GET /me` profile fields instead of static mock data
- standard action envelope generation for mobile mutations
- profile save via `PATCH /profiles/me`
- notification mark-read and mark-all-read via `actions`
- deposit initialization via `POST /wallet/deposits/init` with Paystack checkout opening
- withdrawal request via `POST /wallet/withdrawals` using tokenized bank-account references
- admin withdrawal approval/rejection via `POST /admin/withdrawals/{id}/approve|reject`; the payout processor now claims only approved withdrawals
- admin account freeze via `POST /admin/users/{id}/freeze`, including wallet freeze, jury opt-out, audit log, and user notification
- DARE creation via `POST /dares`, including route-carried review/receipt state
- DARE acceptance via `POST /dares/{id}/accept` for live UUID-backed feed items
- authenticated court tab/status/result/settlement reads from participant-readable `dares` and `court_sessions`
- court ready/countdown screens use the live court session state; ready-up waits for `active` before moving into countdown
- live Court room/presence helpers for `GET /court/{dareId}/live-room`, `POST /court/{dareId}/live-room/enter`, and `POST /court/{dareId}/live-room/presence`
- live Court UI displays provider room state, participant video state, audience count, recording state, and whether the backend live requirement is met
- creator-authored court prompt read via `GET /court/{dareId}/question`, backed by `get_current_court_question_action`, returning prompt/options without answer-key material
- court ready-up via `POST /dares/{id}/ready`
- court heartbeat via `POST /court/{id}/heartbeat`
- court chat send helper via idempotent `POST /court/{dareId}/messages`
- answer submit via `POST /dares/{id}/answers`
- player forfeit via `POST /dares/{id}/forfeit`
- evidence upload request/confirm via `POST /dares/{id}/evidence` and `/evidence/confirm`
- dispute filing via `POST /dares/{id}/disputes`
- dispute file/status screens read live DARE title and score context through `useDareDetail(dareId)` instead of court mock data
- jury eligibility screen derives KYC, trust score, vote count, and readiness from `GET /me` plus live jury summary counts
- native evidence selection through `expo-image-picker` and `expo-document-picker`
- responsible gaming limit changes via idempotent `PATCH /responsible-gaming/settings`
- self-exclusion via idempotent `POST /responsible-gaming/self-exclude`
- preview/mock fallback for Expo Go when backend env vars or auth session are absent

Some secondary screens still render static product/help content until each feature has a durable read model and action contract.

## Current Create Resolution Boundary

Product decision: DARE is creator-authored. The platform does not generate primary challenge questions or tasks. See [`16-dare-resolution-model.md`](16-dare-resolution-model.md).

The Create tab currently lets a player choose Answer Key, Witnessed, or Evidence. These choices are sent to the backend and persisted on `dares.resolution_type`:

- Answer Key -> `answer_key`
- Witnessed -> `witnessed`
- Evidence -> `evidence`

Today, Witnessed and Evidence are stored resolution choices, not separate full post-accept lifecycles. The create transaction, escrow hold, targeted/open status, accept action, and ready-check court creation are shared across all three resolution types.

The `answer_key` implementation uses creator-authored prompt instructions and a committed answer key:

- Answer Key: issuer-authored prompts/answers committed before Court and hidden from the challenger.
- Witnessed: audience/witness signals and result claims captured during live Court.
- Evidence: proof capture/upload and jury/admin review.
- Settlement follows confirmed result, answer-key verification, jury/admin verdict, or void/refund policy.

## Live Court Video Provider Decision

DARE will use LiveKit Cloud for production live Court video.

Current implemented contract:

- backend creates or reuses one LiveKit room per accepted Court DARE
- backend generates short-lived LiveKit tokens in the actions function, never in the client
- mobile enters the live Court through the actions API, receives a token, and renders LiveKit only in native development/production builds
- LiveKit webhooks process room, participant, track, and egress/recording events
- answer/result actions are blocked until the backend live Court requirement is met
- `provider_pending` is only a transitional state before LiveKit room creation succeeds

Required production configuration:

```powershell
supabase secrets set LIVEKIT_URL="wss://your-project.livekit.cloud" LIVEKIT_API_KEY="..." LIVEKIT_API_SECRET="..." --project-ref dhzcoywgiyrbsiiwlstw
```

LiveKit Court recording uses RoomComposite egress. Egress requires an output destination; configure an S3-compatible private bucket before treating Court recordings as evidence-grade:

```powershell
supabase secrets set LIVEKIT_EGRESS_S3_BUCKET="..." LIVEKIT_EGRESS_S3_ACCESS_KEY="..." LIVEKIT_EGRESS_S3_SECRET_KEY="..." LIVEKIT_EGRESS_S3_REGION="..." LIVEKIT_EGRESS_S3_ENDPOINT="..." LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE="true" --project-ref dhzcoywgiyrbsiiwlstw
```

Optional:

```powershell
supabase secrets set LIVEKIT_EGRESS_S3_PREFIX="live-court-recordings" --project-ref dhzcoywgiyrbsiiwlstw
```

Configure the LiveKit Cloud webhook target as:

```text
https://dhzcoywgiyrbsiiwlstw.supabase.co/functions/v1/livekit-webhook
```

The mobile app also needs `EXPO_PUBLIC_LIVEKIT_WS_URL` set to the same LiveKit WebSocket URL for build-time runtime checks. Tokens still come only from the backend.

Expo note: real LiveKit mobile video requires a development build or production build with native modules. Expo Go is not a valid production test target for live Court video.

`mobile/.env.example` exists and is the expected template for local Expo backend configuration.

## Test Coverage Notes

- Edge-function tests cover Paystack deposit webhook replay safety, withdrawal transfer webhook replay safety, action idempotency, route validation, and admin route envelopes.
- RPC integration tests cover settlement fee math, settlement idempotency, DARE accept race protection, self-exclusion escrow restoration, withdrawal projection, withdrawal approval gating, jury guards, rate limiting, cron verification, and wallet provisioning.
- The RPC integration suite requires a running Supabase database at `SUPABASE_DB_URL` or local `127.0.0.1:54322`.

## Production Reviewer Account

Use these accounts for production-phase mobile UI/UX review and two-user end-to-end app testing.

Gmail delivers both plus-addresses to `dareappngofficial@gmail.com`.

| Purpose | Email | Username | Display name | Supabase Auth user id | Profile state | Review balance | Jury review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Reviewer 1 | `dareappngofficial+appreview@gmail.com` | `dare_app_reviewer` | `DARE App Reviewer` | `d9db2377-cc1c-4f46-8dec-69a505b6b1d0` | `active`, `normal` risk, `kyc3` | NGN test ledger credit | opted in for `knowledge`, `sports`, and `creative` |
| Reviewer 2 | `dareappngofficial+appreview2@gmail.com` | `dare_app_reviewer_2` | `DARE App Reviewer 2` | `aec19ebf-7f55-4d11-8edc-62509070074e` | `active`, `normal` risk, `kyc3` | NGN test ledger credit | opted in for `knowledge`, `sports`, and `creative` |

Do not commit or document reviewer passwords. If access is lost, rotate credentials through Supabase Auth Admin or the app password-reset flow and send the new temporary credential through the verified `daregamesapp.com` email channel.

Known setup note: Supabase Auth custom SMTP must use a valid Resend SMTP port. Use `587` for STARTTLS or `465` for SSL/TLS. A misconfigured port can make password-reset requests fail even when the account and redirect URL are valid.

## Remaining Launch Gates

- Jury evidence packets still need richer signed evidence previews; the current mobile read shows live case reason and evidence counts only.
- LiveKit Cloud room/token/webhook integration is wired. RoomComposite egress start/stop orchestration is wired when `LIVEKIT_EGRESS_S3_*` storage secrets are configured; object verification, evidence linkage, retention/deletion jobs, and playback review remain launch-hardening items.
- Witnessed and Evidence need full Court branching after acceptance; they are currently persisted as choices but do not yet have separate post-accept lifecycles.
- Add richer result-claim, witness-signal, and evidence-review surfaces for the non-answer-key paths.
- Support remains static content in the current build. A ticket/contact provider is outside the current implementation and must be selected before production support launch.
- Evidence upload still needs upload progress, retry/resume, and client-side metadata stripping before production use.
- Court chat still needs a mobile screen; the idempotent `POST /court/{dareId}/messages` action route is implemented.
- Admin DARE freeze remains unbuilt, and admin routes still need an operator UI before live-money launch.
- KYC vendor automation, magic-byte validation, malware scanning, and orphan-upload cleanup are deferred future hardening items. The current phase uses private document intake/storage plus internal/manual review.
- Payment provider legal approval, KYC/AML policy, support playbooks, dispute playbooks, and CI execution of the DB-backed integration suite remain pre-launch gates.

## Next Wiring Order

1. Add mobile Court chat and witness/audience signal surfaces.
2. Add result-claim screens for witnessed and evidence paths.
3. Add richer jury evidence preview/signed-download support for jurors.
4. Add production evidence file hardening: image/video metadata stripping, upload progress, and retry/resume behavior.
5. Add admin DARE freeze and operator UI for freeze, withdrawal approval, KYC, and jury operations.
6. Future KYC hardening: selected provider API/webhooks, magic-byte validation, malware scanning, and orphan-upload cleanup.
7. Run the DB-backed RPC integration suite in CI after local/remote migration sync.
