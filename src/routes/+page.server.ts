import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getNextDemoDay, daysUntilDemoDay, getCurrentDemoCycle } from '$lib/server/demo-cycle';
import { isDemoDay } from '$lib/server/demo-day';
import { getCycleTheme } from '$lib/server/cycle-theme';

const PROJECT_CARD_COLUMNS =
	'id, title, description, status, demo_cycle, week, annual_cost_replaced, estimated_hours_saved_weekly, ai_tools_used, screenshot_urls, created_at, project_type, submitter:profiles!submitted_by(id, full_name, department, avatar_url)';

const PROJECT_AGG_COLUMNS =
	'demo_cycle, week, annual_cost_replaced, estimated_hours_saved_weekly, ai_tools_used, status, submitter:profiles!submitted_by(department)';

export const load: PageServerLoad = async ({ locals: { supabase }, parent }) => {
	if (isDemoDay()) {
		throw redirect(302, '/demo-day');
	}

	// Reuse the season already loaded by the root layout instead of re-fetching.
	const { currentSeason: season } = await parent();

	const currentCycle = season ? getCurrentDemoCycle(new Date(season.start_date)) : 1;

	// All queries run in parallel — no sequential awaits.
	const [
		{ data: featuredProjects },
		{ data: departmentStats },
		{ data: recentProjects },
		{ data: activeChallenges },
		{ data: aggProjects },
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
		supabase
			.from('projects')
			.select(PROJECT_AGG_COLUMNS)
			.in('status', ['submitted', 'featured'])
			.order('created_at', { ascending: true }),
		supabase.rpc('get_totals'),
		getCycleTheme(supabase, currentCycle, season?.id ?? null)
	]);

	// Server-side aggregation for analytics charts (was previously $derived.by on the client)
	const projectsForAgg = aggProjects ?? [];

	const weekMap = new Map<number, { week: number; submissions: number; costSaved: number; hoursSaved: number }>();
	const aiToolCounts: Record<string, number> = {};
	const deptToolMatrix: Record<string, Record<string, number>> = {};

	for (const p of projectsForAgg) {
		const w = (p as any).demo_cycle ?? (p as any).week ?? 0;
		if (!weekMap.has(w)) {
			weekMap.set(w, { week: w, submissions: 0, costSaved: 0, hoursSaved: 0 });
		}
		const bucket = weekMap.get(w)!;
		bucket.submissions++;
		bucket.costSaved += (p as any).annual_cost_replaced ?? 0;
		bucket.hoursSaved += (p as any).estimated_hours_saved_weekly ?? 0;

		const dept = ((p as any).submitter as any)?.department || 'Unknown';
		const tools = ((p as any).ai_tools_used ?? []) as string[];
		for (const tool of tools) {
			aiToolCounts[tool] = (aiToolCounts[tool] || 0) + 1;
			if (!deptToolMatrix[dept]) deptToolMatrix[dept] = {};
			deptToolMatrix[dept][tool] = (deptToolMatrix[dept][tool] || 0) + 1;
		}
	}

	const weeklyData = Array.from(weekMap.values()).sort((a, b) => a.week - b.week);

	let cumulative = 0;
	const cumulativeData = weeklyData.map((w) => {
		cumulative += w.costSaved;
		return { week: w.week, total: cumulative };
	});

	const aiToolCountsArray = Object.entries(aiToolCounts).sort((a, b) => b[1] - a[1]);

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
