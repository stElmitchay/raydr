import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: projects } = await supabase
		.from('projects')
		.select('id, title, replaces_tool, annual_cost_replaced, ai_tools_used, tech_stack, adoption_count')
		.order('adoption_count', { ascending: false });

	return { projects: projects ?? [] };
};
