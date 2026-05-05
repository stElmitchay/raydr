import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'private, max-age=300, stale-while-revalidate=900' });

	// One projects query covers BOTH the time-series chart and the dept×tool
	// heatmap — there's no reason to fetch the same table twice.
	const [
		{ data: projects },
		{ count: profileCount },
		{ data: departmentStats },
		{ data: totals }
	] = await Promise.all([
		supabase
			.from('projects')
			.select('week, demo_cycle, annual_cost_replaced, estimated_hours_saved_weekly, ai_tools_used, submitter:profiles!submitted_by(department)')
			.in('status', ['submitted', 'featured'])
			.order('created_at', { ascending: true })
			.limit(1000),
		supabase.from('profiles').select('id', { count: 'exact', head: true }),
		supabase.rpc('get_department_stats'),
		supabase.rpc('get_totals')
	]);

	const allProjects = (projects ?? []) as any[];

	return {
		projects: allProjects,
		profileCount: profileCount ?? 0,
		departmentStats: departmentStats ?? [],
		// Same row set serves the heatmap view; the page reads .submitter.department.
		projectsWithDept: allProjects,
		totals: totals ?? {
			total_cost_saved: 0,
			total_hours_saved: 0,
			total_projects: 0,
			active_builders: 0
		}
	};
};
