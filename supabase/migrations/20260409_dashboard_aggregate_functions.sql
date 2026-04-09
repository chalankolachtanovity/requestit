-- Dashboard aggregate RPCs
-- These move the hottest dashboard aggregations into Postgres.

create or replace function public.get_dashboard_credits_total()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(pa.amount_cents), 0)::bigint
  from public.sessions s
  join public.payment_attempts pa
    on pa.session_id = s.id
   and pa.payment_status = 'captured'
   and pa.dj_decision = 'accepted'
  where s.user_id = auth.uid();
$$;

grant execute on function public.get_dashboard_credits_total() to authenticated;

create or replace function public.get_dashboard_sessions()
returns table (
  id uuid,
  name text,
  slug text,
  is_active boolean,
  mode text,
  min_priority_amount_cents integer,
  allow_free_requests boolean,
  allow_paid_requests boolean,
  starts_at timestamptz,
  created_at timestamptz,
  earned_cents bigint,
  requests_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.name,
    s.slug,
    s.is_active,
    s.mode::text,
    s.min_priority_amount_cents,
    s.allow_free_requests,
    s.allow_paid_requests,
    s.starts_at,
    s.created_at,
    coalesce(earned.earned_cents, 0)::bigint as earned_cents,
    coalesce(reqs.requests_count, 0)::bigint as requests_count
  from public.sessions s
  left join (
    select
      session_id,
      sum(amount_cents)::bigint as earned_cents
    from public.payment_attempts
    where payment_status = 'captured'
      and dj_decision = 'accepted'
    group by session_id
  ) earned on earned.session_id = s.id
  left join (
    select
      session_id,
      count(*)::bigint as requests_count
    from public.requests
    group by session_id
  ) reqs on reqs.session_id = s.id
  where s.user_id = auth.uid()
  order by s.created_at desc;
$$;

grant execute on function public.get_dashboard_sessions() to authenticated;
