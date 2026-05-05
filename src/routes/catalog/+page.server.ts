import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'private, max-age=300, stale-while-revalidate=900' });

	const { data: projects } = await supabase
		.from('projects')
		.select('id, title, replaces_tool, annual_cost_replaced, ai_tools_used, tech_stack, adoption_count')
		.in('status', ['submitted', 'featured'])
		.order('adoption_count', { ascending: false })
		.limit(200);

	return { projects: projects ?? [] };
};
