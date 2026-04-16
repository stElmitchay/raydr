import type { PageServerLoad } from './$types';

const PROJECT_LIST_COLUMNS =
	'id, title, description, status, demo_cycle, week, annual_cost_replaced, estimated_hours_saved_weekly, ai_tools_used, screenshot_urls, created_at, project_type, adoption_count, submitter:profiles!submitted_by(id, full_name, department, avatar_url)';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const status = url.searchParams.get('status') || 'all';
	const sort = url.searchParams.get('sort') || 'newest';
	const search = url.searchParams.get('q') || '';
	const type = url.searchParams.get('type') || 'all';

	let query = supabase
		.from('projects')
		.select(PROJECT_LIST_COLUMNS);

	if (status !== 'all') {
		query = query.eq('status', status);
	}

	if (type !== 'all') {
		query = query.eq('project_type', type);
	}

	if (search) {
		query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
	}

	switch (sort) {
		case 'cost':
			query = query.order('annual_cost_replaced', { ascending: false });
			break;
		case 'hours':
			query = query.order('estimated_hours_saved_weekly', { ascending: false });
			break;
		case 'adoption':
			query = query.order('adoption_count', { ascending: false });
			break;
		default:
			query = query.order('created_at', { ascending: false });
	}

	const { data: projects } = await query.limit(100);

	return { projects: (projects ?? []) as any[] };
};
