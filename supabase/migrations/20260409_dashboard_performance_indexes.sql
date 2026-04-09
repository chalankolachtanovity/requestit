-- Dashboard/session performance indexes
-- Focused on the hottest read paths:
-- - dashboard sessions list
-- - transactions list
-- - session queue / live preview
-- - request/payment lookup by foreign key

create index if not exists idx_sessions_user_created_at
  on public.sessions (user_id, created_at desc);

create index if not exists idx_requests_session_status_type_created_at
  on public.requests (session_id, status, type, created_at desc)
  include (payment_attempt_id, track_id, custom_track_name, custom_artist_name)
  where status in ('pending', 'accepted');

create index if not exists idx_requests_session_status_created_at
  on public.requests (session_id, status, created_at desc)
  where status in ('pending', 'accepted');

create index if not exists idx_requests_payment_attempt_id
  on public.requests (payment_attempt_id)
  where payment_attempt_id is not null;

create index if not exists idx_payment_attempts_session_captured_accepted_created_at
  on public.payment_attempts (session_id, created_at desc)
  include (amount_cents, track_id, custom_track_name, custom_artist_name)
  where payment_status = 'captured' and dj_decision = 'accepted';
