-- Transactions RPC for dashboard

create or replace function public.get_dashboard_transactions()
returns table (
  id uuid,
  amount_cents integer,
  created_at timestamptz,
  session_id uuid,
  session_name text,
  session_slug text,
  track_id uuid,
  track_name text,
  artist text,
  image_url text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    pa.id,
    coalesce(pa.amount_cents, 0) as amount_cents,
    pa.created_at,
    s.id as session_id,
    s.name as session_name,
    s.slug as session_slug,
    t.id as track_id,
    coalesce(t.track_name, pa.custom_track_name, 'Neznama pesnicka') as track_name,
    coalesce(t.artist, pa.custom_artist_name, 'Neznamy interpret') as artist,
    t.image_url
  from public.payment_attempts pa
  join public.sessions s
    on s.id = pa.session_id
  left join public.tracks t
    on t.id = pa.track_id
  where s.user_id = auth.uid()
    and pa.payment_status = 'captured'
    and pa.dj_decision = 'accepted'
  order by pa.created_at desc;
$$;

grant execute on function public.get_dashboard_transactions() to authenticated;
