-- Migration 010: Home-page analytics aggregation moved into Postgres.
--
-- Replaces the homepage's 1000-row fetch + JS aggregation in
-- `src/routes/+page.server.ts`. Postgres aggregates and ships back a single
-- JSON payload (a few KB instead of hundreds of KB).
--
-- Returns: { weeklyData, cumulativeData, aiToolCountsArray }

create or replace function public.get_home_analytics(p_season_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  weekly_data jsonb;
  cumulative_data jsonb;
  tool_counts jsonb;
begin
  -- Per-cycle submissions, cost, hours.
  with cycles as (
    select
      coalesce(p.demo_cycle, p.week, 0) as week,
      count(*) as submissions,
      coalesce(sum(p.annual_cost_replaced), 0) as cost_saved,
      coalesce(sum(p.estimated_hours_saved_weekly), 0) as hours_saved
    from projects p
    where p.status in ('submitted', 'featured')
      and (p_season_id is null or p.season = p_season_id)
    group by coalesce(p.demo_cycle, p.week, 0)
    order by week
  ),
  cumulative as (
    select
      week,
      sum(cost_saved) over (order by week) as total
    from cycles
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'week', week,
      'submissions', submissions,
      'costSaved', cost_saved,
      'hoursSaved', hours_saved
    )), '[]'::jsonb)
    into weekly_data
  from cycles;

  with cycles as (
    select
      coalesce(p.demo_cycle, p.week, 0) as week,
      coalesce(sum(p.annual_cost_replaced), 0) as cost_saved
    from projects p
    where p.status in ('submitted', 'featured')
      and (p_season_id is null or p.season = p_season_id)
    group by coalesce(p.demo_cycle, p.week, 0)
  ),
  ranked as (
    select
      week,
      sum(cost_saved) over (order by week) as total
    from cycles
  )
  select coalesce(jsonb_agg(jsonb_build_object('week', week, 'total', total) order by week), '[]'::jsonb)
    into cumulative_data
  from ranked;

  -- AI tool counts (unnest the ai_tools_used array, sort desc).
  with tools as (
    select unnest(p.ai_tools_used) as tool
    from projects p
    where p.status in ('submitted', 'featured')
      and (p_season_id is null or p.season = p_season_id)
      and p.ai_tools_used is not null
  ),
  counts as (
    select tool, count(*) as n
    from tools
    where tool is not null and tool <> ''
    group by tool
    order by n desc
  )
  select coalesce(jsonb_agg(jsonb_build_array(tool, n)), '[]'::jsonb)
    into tool_counts
  from counts;

  return jsonb_build_object(
    'weeklyData', weekly_data,
    'cumulativeData', cumulative_data,
    'aiToolCountsArray', tool_counts
  );
end;
$$;

grant execute on function public.get_home_analytics(uuid) to anon, authenticated;
