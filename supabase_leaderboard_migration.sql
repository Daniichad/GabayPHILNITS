-- 1. Create points_ledger table
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  category text check (category in ('streak', 'reading', 'practice', 'mock_exam')) not null,
  points integer not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- 2. Indexes for fast leaderboard querying
create index idx_points_ledger_user_id on points_ledger(user_id);
create index idx_points_ledger_created_at on points_ledger(created_at);

-- 3. Leaderboard Views

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

-- 4. RPC for syncing points from the mobile client
-- This allows the client to push batched offline points safely.
-- It expects a JSON array of points objects.
create or replace function sync_points_ledger(payload jsonb)
returns void as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(payload)
  loop
    -- Here we would add validation logic against daily caps if needed,
    -- but for now we trust the pre-calculated points from the client engine.
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
