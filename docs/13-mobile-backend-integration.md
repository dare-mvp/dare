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
- KYC submit form wired to `POST /kyc/submit` with basic client validation and authenticated-session gating
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

`mobile/.env.example` exists and is the expected template for local Expo backend configuration.

## Test Coverage Notes

- Edge-function tests cover Paystack deposit webhook replay safety, withdrawal transfer webhook replay safety, action idempotency, route validation, and admin route envelopes.
- RPC integration tests cover settlement fee math, settlement idempotency, DARE accept race protection, self-exclusion escrow restoration, withdrawal projection, withdrawal approval gating, jury guards, rate limiting, cron verification, and wallet provisioning.
- The RPC integration suite requires a running Supabase database at `SUPABASE_DB_URL` or local `127.0.0.1:54322`.

## Remaining Launch Gates

- Jury evidence packets still need richer signed evidence previews; the current mobile read shows live case reason and evidence counts only.
- Witnessed and Evidence need full Court branching after acceptance; they are currently persisted as choices but do not yet have separate post-accept lifecycles.
- Add richer result-claim, witness-signal, and evidence-review surfaces for the non-answer-key paths.
- Support remains static content in the current build. A ticket/contact provider is outside the current implementation and must be selected before production support launch.
- Evidence upload still needs upload progress, retry/resume, and client-side metadata stripping before production use.
- Court chat still needs a mobile screen; the idempotent `POST /court/{dareId}/messages` action route is implemented.
- Admin DARE freeze remains unbuilt, and admin routes still need an operator UI before live-money launch.
- KYC provider webhook is outside the current implementation. The internal/manual KYC review contract remains the active integration surface until a provider is selected.
- Payment provider legal approval, KYC/AML policy, support playbooks, dispute playbooks, and CI execution of the DB-backed integration suite remain pre-launch gates.

## Next Wiring Order

1. Add mobile Court chat and witness/audience signal surfaces.
2. Add result-claim screens for witnessed and evidence paths.
3. Add richer jury evidence preview/signed-download support for jurors.
4. Add production file hardening: image/video metadata stripping, upload progress, and retry/resume behavior.
5. Add admin DARE freeze and operator UI for freeze, withdrawal approval, KYC, and jury operations.
6. Run the DB-backed RPC integration suite in CI after local/remote migration sync.
