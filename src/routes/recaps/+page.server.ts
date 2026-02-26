import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
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
		.select('*, submitter:profiles!submitted_by(*)')
		.eq('season', activeSeason.id)
		.in('status', ['submitted', 'featured'])
		.order('annual_cost_replaced', { ascending: false });

	// Aggregate by week
	const weekMap = new Map<number, {
		week: number;
		count: number;
		costSaved: number;
		hoursSaved: number;
		winner: { title: string; submitterName: string; costSaved: number } | null;
	}>();

	for (const p of projects ?? []) {
		const w = p.week ?? 1;
		const existing = weekMap.get(w) ?? { week: w, count: 0, costSaved: 0, hoursSaved: 0, winner: null };
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
		weekMap.set(w, existing);
	}

	const weeks = Array.from(weekMap.values()).sort((a, b) => b.week - a.week);

	return { season: activeSeason, weeks };
};
