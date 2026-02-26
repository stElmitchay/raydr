import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const weekNum = parseInt(params.week);
	if (isNaN(weekNum)) throw error(400, 'Invalid week number');

	const { data: activeSeason } = await supabase
		.from('seasons')
		.select('*')
		.eq('is_active', true)
		.single();

	if (!activeSeason) throw error(404, 'No active season');

	const { data: projects } = await supabase
		.from('projects')
		.select('*, submitter:profiles!submitted_by(*)')
		.eq('season', activeSeason.id)
		.eq('week', weekNum)
		.in('status', ['submitted', 'featured'])
		.order('annual_cost_replaced', { ascending: false });

	if (!projects || projects.length === 0) {
		throw error(404, `No submissions for week ${weekNum}`);
	}

	// Stats
	const totalCost = projects.reduce((s, p) => s + (p.annual_cost_replaced ?? 0), 0);
	const totalHours = projects.reduce((s, p) => s + (p.estimated_hours_saved_weekly ?? 0), 0);
	const departments = new Set(projects.map(p => p.submitter?.department).filter(Boolean));

	// AI tool usage counts
	const toolCounts = new Map<string, number>();
	for (const p of projects) {
		for (const tool of p.ai_tools_used ?? []) {
			toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
		}
	}
	const topTools = Array.from(toolCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([name, count]) => ({ name, count }));

	const winner = projects[0];

	return {
		season: activeSeason,
		week: weekNum,
		projects,
		stats: {
			submissions: projects.length,
			totalCost,
			totalHours,
			departments: departments.size
		},
		topTools,
		winner
	};
};
