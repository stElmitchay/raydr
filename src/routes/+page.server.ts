import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getNextDemoDay, daysUntilDemoDay, getCurrentDemoCycle } from '$lib/server/demo-cycle';
import { isDemoDay } from '$lib/server/demo-day';
import { getCycleTheme } from '$lib/server/cycle-theme';

const PROJECT_CARD_COLUMNS =
	'id, title, description, status, demo_cycle, week, annual_cost_replaced, estimated_hours_saved_weekly, ai_tools_used, screenshot_urls, created_at, project_type, submitter:profiles!submitted_by(id, full_name, department, avatar_url)';

export const load: PageServerLoad = async ({ locals: { supabase }, parent, setHeaders }) => {
	if (isDemoDay()) {
		throw redirect(302, '/demo-day');
	}

	setHeaders({ 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' });

	// Reuse the season already loaded by the root layout instead of re-fetching.
	const { currentSeason: season } = await parent();

	const currentCycle = season ? getCurrentDemoCycle(new Date(season.start_date)) : 1;

	// All queries run in parallel — no sequential awaits.
	const [
		{ data: featuredProjects },
		{ data: departmentStats },
		{ data: recentProjects },
		{ data: activeChallenges },
		{ data: analytics },
		{ data: totals },
		cycleTheme
	] = await Promise.all([
		supabase
			.from('projects')
			.select(PROJECT_CARD_COLUMNS)
			.eq('status', 'featured')
			.order('created_at', { ascending: false })
			.limit(12),
		supabase.rpc('get_department_stats'),
		supabase
			.from('projects')
			.select('id, title, demo_cycle, week, created_at, submitter:profiles!submitted_by(id, full_name, department)')
			.order('created_at', { ascending: false })
			.limit(5),
		supabase
			.from('challenges')
			.select('id, title, end_date, metric, target')
			.eq('is_active', true)
			.order('end_date', { ascending: true })
			.limit(3),
		// Server-side aggregation in Postgres (migration-010). Ships ~few KB
		// of JSON instead of fetching up to 1000 project rows for client-side
		// reduction.
		supabase.rpc('get_home_analytics', { p_season_id: season?.id ?? null }),
		supabase.rpc('get_totals'),
		getCycleTheme(supabase, currentCycle, season?.id ?? null)
	]);

	const weeklyData = (analytics as any)?.weeklyData ?? [];
	const cumulativeData = (analytics as any)?.cumulativeData ?? [];
	const aiToolCountsArray = (analytics as any)?.aiToolCountsArray ?? [];

	return {
		currentCycle,
		season,
		cycleTheme,
		featuredProjects: featuredProjects ?? [],
		departmentStats: departmentStats ?? [],
		recentProjects: recentProjects ?? [],
		activeChallenges: activeChallenges ?? [],
		// Pre-computed analytics (no more client-side iteration)
		weeklyData,
		cumulativeData,
		aiToolCountsArray,
		totals: totals ?? {
			total_cost_saved: 0,
			total_hours_saved: 0,
			total_adoptions: 0,
			total_projects: 0,
			active_builders: 0
		},
		nextDemoDay: getNextDemoDay().toISOString(),
		daysUntilDemo: daysUntilDemoDay()
	};
};
