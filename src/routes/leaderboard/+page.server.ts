import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const type = url.searchParams.get('type') || 'all';

	// Skinny column selects + parallel queries.
	const profilesPromise = supabase
		.from('profiles')
		.select('id, full_name, avatar_url, department, level, total_xp, role')
		.order('total_xp', { ascending: false });

	let projectsQuery = supabase
		.from('projects')
		.select('id, title, replaces_tool, annual_cost_replaced, estimated_hours_saved_weekly, submitted_by, project_type')
		.order('annual_cost_replaced', { ascending: false });

	if (type !== 'all') {
		projectsQuery = projectsQuery.eq('project_type', type);
	}

	const [{ data: profiles }, { data: projects }] = await Promise.all([
		profilesPromise,
		projectsQuery
	]);

	// Build per-user aggregation in a single pass (O(n)) instead of O(n*m) filter-per-profile.
	const stats = new Map<string, { project_count: number; total_saved: number }>();
	for (const p of projects ?? []) {
		const sb = (p as any).submitted_by;
		if (!sb) continue;
		const cur = stats.get(sb) ?? { project_count: 0, total_saved: 0 };
		cur.project_count++;
		cur.total_saved += (p as any).annual_cost_replaced ?? 0;
		stats.set(sb, cur);
	}

	const builders = (profiles ?? []).map((profile, index) => {
		const s = stats.get((profile as any).id) ?? { project_count: 0, total_saved: 0 };
		return {
			...profile,
			rank: index + 1,
			project_count: s.project_count,
			total_saved: s.total_saved
		};
	});

	return {
		builders,
		projects: projects ?? []
	};
};
