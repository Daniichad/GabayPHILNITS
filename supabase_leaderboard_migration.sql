-- 1. Create points_ledger table
create table if not exists points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null check (category in ('streak', 'reading', 'practice', 'mock_exam')),
  points integer not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- 2. Indexes for fast leaderboard querying
create index if not exists idx_points_ledger_user_id on points_ledger(user_id);
create index if not exists idx_points_ledger_created_at on points_ledger(created_at);

-- 3. Row Level Security (RLS)
alter table points_ledger enable row level security;

drop policy if exists "Allow authenticated read points_ledger" on points_ledger;
create policy "Allow authenticated read points_ledger" 
on points_ledger for select 
to authenticated 
using (true);

drop policy if exists "Allow authenticated insert points_ledger" on points_ledger;
create policy "Allow authenticated insert points_ledger" 
on points_ledger for insert 
to authenticated 
with check (true);

-- 4. Leaderboard Views

-- All-Time Leaderboard
create or replace view leaderboard_all_time as
select user_id, sum(points) as total_points
from points_ledger
group by user_id
order by total_points desc;

-- Monthly Leaderboard
create or replace view leaderboard_monthly as
select user_id, sum(points) as total_points
from points_ledger
where created_at >= date_trunc('month', now())
group by user_id
order by total_points desc;

-- Weekly Leaderboard
create or replace view leaderboard_weekly as
select user_id, sum(points) as total_points
from points_ledger
where created_at >= date_trunc('week', now())
group by user_id
order by total_points desc;

-- 5. RPC for syncing points from the mobile client
-- This allows the client to push batched offline points safely.
-- It expects a JSON array of points objects.
create or replace function sync_points_ledger(payload jsonb)
returns void as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(payload)
  loop
    insert into points_ledger (user_id, category, points, metadata, created_at)
    values (
      (item->>'user_id')::uuid,
      item->>'category',
      (item->>'points')::integer,
      item->'metadata',
      coalesce((item->>'created_at')::timestamptz, now())
    );
  end loop;
end;
$$ language plpgsql security definer;

-- Grant execution to authenticated and anon users
grant execute on function sync_points_ledger(jsonb) to authenticated, anon;
grant select, insert on table points_ledger to authenticated, anon;
