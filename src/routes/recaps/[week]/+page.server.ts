import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase }, parent }) => {
	const cycleNum = parseInt(params.week);
	if (isNaN(cycleNum)) throw error(400, 'Invalid demo cycle number');

	// Reuse the season from the layout instead of re-fetching.
	const { currentSeason: activeSeason } = await parent();
	if (!activeSeason) throw error(404, 'No active season');

	// Single query covering both demo_cycle and legacy week column.
	const { data: projects } = await supabase
		.from('projects')
		.select(
			'id, title, description, annual_cost_replaced, estimated_hours_saved_weekly, ai_tools_used, demo_cycle, week, screenshot_urls, submitter:profiles!submitted_by(id, full_name, department, avatar_url)'
		)
		.eq('season', activeSeason.id)
		.or(`demo_cycle.eq.${cycleNum},week.eq.${cycleNum}`)
		.in('status', ['submitted', 'featured'])
		.order('annual_cost_replaced', { ascending: false });

	if (!projects || projects.length === 0) {
		throw error(404, `No submissions for demo cycle ${cycleNum}`);
	}

	// Stats (single pass)
	let totalCost = 0;
	let totalHours = 0;
	const departments = new Set<string>();
	const toolCounts = new Map<string, number>();

	for (const p of projects) {
		totalCost += (p as any).annual_cost_replaced ?? 0;
		totalHours += (p as any).estimated_hours_saved_weekly ?? 0;
		const dept = ((p as any).submitter as any)?.department;
		if (dept) departments.add(dept);
		for (const tool of ((p as any).ai_tools_used ?? []) as string[]) {
			toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
		}
	}

	const topTools = Array.from(toolCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([name, count]) => ({ name, count }));

	const winner = projects[0];

	return {
		season: activeSeason,
		cycle: cycleNum,
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
