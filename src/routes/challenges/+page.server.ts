import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Reuse the existing get_department_stats RPC instead of fetching all projects
	// and aggregating in JavaScript.
	const [{ data: challenges }, { data: deptStats }] = await Promise.all([
		supabase
			.from('challenges')
			.select('id, title, description, metric, target, start_date, end_date, is_active, season')
			.eq('is_active', true)
			.order('end_date', { ascending: true }),
		supabase.rpc('get_department_stats')
	]);

	// Reshape RPC result into the deptMetrics map the page expects.
	const deptMetrics: Record<string, { cost_saved: number; projects: number; hours_saved: number }> = {};
	for (const row of deptStats ?? []) {
		const dept = (row as any).department || 'Unknown';
		deptMetrics[dept] = {
			cost_saved: Number((row as any).total_cost_saved ?? 0),
			projects: Number((row as any).total_projects ?? 0),
			hours_saved: Number((row as any).total_hours_saved ?? 0)
		};
	}

	return {
		challenges: challenges ?? [],
		deptMetrics
	};
};
