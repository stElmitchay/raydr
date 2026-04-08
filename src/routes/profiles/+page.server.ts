import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Skinny columns + parallel queries.
	const [{ data: profiles }, { data: projects }] = await Promise.all([
		supabase
			.from('profiles')
			.select('id, full_name, avatar_url, department, title, level, total_xp, streak')
			.order('total_xp', { ascending: false }),
		supabase.from('projects').select('submitted_by')
	]);

	const projectCounts: Record<string, number> = {};
	for (const p of projects ?? []) {
		if ((p as any).submitted_by) {
			projectCounts[(p as any).submitted_by] = (projectCounts[(p as any).submitted_by] || 0) + 1;
		}
	}

	const enrichedProfiles = (profiles ?? []).map((p) => ({
		...p,
		project_count: projectCounts[(p as any).id] ?? 0
	}));

	return { profiles: enrichedProfiles };
};
