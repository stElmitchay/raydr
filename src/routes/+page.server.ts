import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getNextDemoDay, daysUntilDemoDay, getCurrentDemoCycle } from '$lib/server/demo-cycle';
import { isDemoDay } from '$lib/server/demo-day';
import { getCycleTheme } from '$lib/server/cycle-theme';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	if (isDemoDay()) {
		throw redirect(302, '/demo-day');
	}

	const { data: season } = await supabase
		.from('seasons')
		.select('*')
		.eq('is_active', true)
		.single();

	const currentCycle = season
		? getCurrentDemoCycle(new Date(season.start_date))
		: 1;

	const [
		{ data: featuredProjects },
		{ data: departmentStats },
		{ data: recentProjects },
		{ data: activeChallenges },
		{ data: allProjects },
		{ data: projectsWithDept },
		cycleTheme
	] = await Promise.all([
		supabase
			.from('projects')
			.select('*, submitter:profiles!submitted_by(*)')
			.eq('status', 'featured')
			.order('created_at', { ascending: false }),
		supabase.rpc('get_department_stats'),
		supabase
			.from('projects')
			.select('*, submitter:profiles!submitted_by(*)')
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
			.select('week, demo_cycle, annual_cost_replaced, estimated_hours_saved_weekly, ai_tools_used')
			.order('created_at', { ascending: true }),
		supabase
			.from('projects')
			.select('ai_tools_used, submitter:profiles!submitted_by(department)'),
		getCycleTheme(supabase, currentCycle, season?.id ?? null)
	]);

	const { data: totals } = await supabase.rpc('get_totals');

	return {
		currentCycle,
		season,
		cycleTheme,
		featuredProjects: featuredProjects ?? [],
		departmentStats: departmentStats ?? [],
		recentProjects: recentProjects ?? [],
		activeChallenges: activeChallenges ?? [],
		allProjects: allProjects ?? [],
		projectsWithDept: projectsWithDept ?? [],
		totals: totals ?? { total_cost_saved: 0, total_hours_saved: 0, total_adoptions: 0, total_projects: 0, active_builders: 0 },
		nextDemoDay: getNextDemoDay().toISOString(),
		daysUntilDemo: daysUntilDemoDay()
	};
};
