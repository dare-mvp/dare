-- One-time "Champion & Legend are back" reactivation email tracking.
-- Separate from closing_email_sent_at (which is for the Legend closing-soon
-- nudge) — this flags whether someone has received the one-off relaunch
-- announcement, so a re-run of the send never double-emails anyone.

alter table public.marketing_waitlist
  add column if not exists challenge_reactivation_sent_at timestamptz;
