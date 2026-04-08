import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Skinny columns + parallel queries. Don't fetch all profile rows just to count them
	// — use a head:true count query.
	const [
		{ data: projects },
		{ count: profileCount },
		{ data: departmentStats },
		{ data: projectsWithDept },
		{ data: totals }
	] = await Promise.all([
		supabase
			.from('projects')
			.select('week, demo_cycle, annual_cost_replaced, estimated_hours_saved_weekly, ai_tools_used')
			.order('created_at', { ascending: true }),
		supabase.from('profiles').select('*', { count: 'exact', head: true }),
		supabase.rpc('get_department_stats'),
		supabase
			.from('projects')
			.select('ai_tools_used, submitter:profiles!submitted_by(department)'),
		supabase.rpc('get_totals')
	]);

	return {
		projects: projects ?? [],
		profileCount: profileCount ?? 0,
		departmentStats: departmentStats ?? [],
		projectsWithDept: projectsWithDept ?? [],
		totals: totals ?? {
			total_cost_saved: 0,
			total_hours_saved: 0,
			total_projects: 0,
			active_builders: 0
		}
	};
};
