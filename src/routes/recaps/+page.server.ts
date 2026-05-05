import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'private, max-age=600, stale-while-revalidate=3600' });

	const { data: activeSeason } = await supabase
		.from('seasons')
		.select('*')
		.eq('is_active', true)
		.single();

	if (!activeSeason) {
		return { season: null, weeks: [] };
	}

	const { data: projects } = await supabase
		.from('projects')
		.select(
			'id, title, demo_cycle, week, annual_cost_replaced, estimated_hours_saved_weekly, submitter:profiles!submitted_by(id, full_name, department)'
		)
		.eq('season', activeSeason.id)
		.in('status', ['submitted', 'featured'])
		.order('annual_cost_replaced', { ascending: false })
		.limit(500);

	// Aggregate by demo cycle (fall back to week for legacy data)
	const cycleMap = new Map<number, {
		cycle: number;
		count: number;
		costSaved: number;
		hoursSaved: number;
		winner: { title: string; submitterName: string; costSaved: number } | null;
	}>();

	for (const raw of projects ?? []) {
		const p = raw as any;
		const c = p.demo_cycle ?? p.week ?? 1;
		const existing = cycleMap.get(c) ?? { cycle: c, count: 0, costSaved: 0, hoursSaved: 0, winner: null };
		existing.count++;
		existing.costSaved += p.annual_cost_replaced ?? 0;
		existing.hoursSaved += p.estimated_hours_saved_weekly ?? 0;
		if (!existing.winner || (p.annual_cost_replaced ?? 0) > existing.winner.costSaved) {
			existing.winner = {
				title: p.title,
				submitterName: p.submitter?.full_name ?? 'Unknown',
				costSaved: p.annual_cost_replaced ?? 0
			};
		}
		cycleMap.set(c, existing);
	}

	const cycles = Array.from(cycleMap.values()).sort((a, b) => b.cycle - a.cycle);

	return { season: activeSeason, cycles };
};
