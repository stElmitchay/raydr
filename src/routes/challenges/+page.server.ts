import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: challenges } = await supabase
		.from('challenges')
		.select('*')
		.eq('is_active', true)
		.order('end_date', { ascending: true });

	// Get projects with submitter department for aggregation
	const { data: projects } = await supabase
		.from('projects')
		.select('annual_cost_replaced, estimated_hours_saved_weekly, submitter:profiles!submitted_by(department)')
		.in('status', ['submitted', 'featured']);

	// Pre-compute department progress for each metric
	const deptMetrics: Record<string, { cost_saved: number; projects: number; hours_saved: number }> = {};
	for (const p of projects ?? []) {
		const dept = (p.submitter as any)?.department || 'Unknown';
		if (!deptMetrics[dept]) deptMetrics[dept] = { cost_saved: 0, projects: 0, hours_saved: 0 };
		deptMetrics[dept].cost_saved += p.annual_cost_replaced ?? 0;
		deptMetrics[dept].projects += 1;
		deptMetrics[dept].hours_saved += p.estimated_hours_saved_weekly ?? 0;
	}

	return {
		challenges: challenges ?? [],
		deptMetrics
	};
};
