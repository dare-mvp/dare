# Mobile Backend Integration Notes

## Environment

The Expo app reads backend configuration from public Expo environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_ACTIONS_FUNCTION_URL`

`EXPO_PUBLIC_ACTIONS_FUNCTION_URL` should normally be:

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
- profile edit screen populated from `GET /me` profile fields instead of static mock data
- standard action envelope generation for mobile mutations
- profile save via `PATCH /profiles/me`
- notification mark-read and mark-all-read via `actions`
- deposit initialization via `POST /wallet/deposits/init` with Paystack checkout opening
- withdrawal request via `POST /wallet/withdrawals` using tokenized bank-account references
- DARE creation via `POST /dares`, including route-carried review/receipt state
- DARE acceptance via `POST /dares/{id}/accept` for live UUID-backed feed items
- court ready-up via `POST /dares/{id}/ready`
- court heartbeat via `POST /court/{id}/heartbeat`
- answer submit via `POST /dares/{id}/answers`
- player forfeit via `POST /dares/{id}/forfeit`
- evidence upload request/confirm via `POST /dares/{id}/evidence` and `/evidence/confirm`
- dispute filing via `POST /dares/{id}/disputes`
- native evidence selection through `expo-image-picker` and `expo-document-picker`
- responsible gaming limit changes via idempotent `PATCH /responsible-gaming/settings`
- self-exclusion via idempotent `POST /responsible-gaming/self-exclude`
- preview/mock fallback for Expo Go when backend env vars or auth session are absent

Some secondary screens still render mock domain data until each feature is connected to read models and action responses.

## Next Wiring Order

1. Add route-level loading, empty, and retry states as each live read replaces mocks.
2. Replace remaining mock-only KYC, jury, settings, support, and transaction-detail screens with typed server read models.
3. Add focused tests for action-envelope generation and mapper edge cases.
4. Add production file hardening: image/video metadata stripping, upload progress, and retry/resume behavior.
