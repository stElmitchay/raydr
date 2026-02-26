import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, session } }) => {
	const { data: project } = await supabase
		.from('projects')
		.select('*, submitter:profiles!submitted_by(*)')
		.eq('id', params.id)
		.single();

	if (!project) {
		throw error(404, 'Project not found');
	}

	// Fetch team members, comments, and adoptions in parallel
	const teamPromise = project.team_members?.length > 0
		? supabase.from('profiles').select('*').in('id', project.team_members)
		: Promise.resolve({ data: [] });

	const commentsPromise = supabase
		.from('comments')
		.select('*, commenter:profiles!user_id(*)')
		.eq('project_id', params.id)
		.order('created_at', { ascending: true });

	const adoptionsPromise = supabase
		.from('adoptions')
		.select('*, adopter:profiles!user_id(*)')
		.eq('project_id', params.id);

	const [teamResult, commentsResult, adoptionsResult] = await Promise.all([
		teamPromise,
		commentsPromise,
		adoptionsPromise
	]);

	return {
		project,
		teamMembers: teamResult.data ?? [],
		comments: commentsResult.data ?? [],
		adoptions: adoptionsResult.data ?? [],
		userId: session?.user?.id ?? null
	};
};

export const actions: Actions = {
	comment: async ({ request, params, locals: { supabase, session } }) => {
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const content = (formData.get('content') as string)?.trim();

		if (!content || content.length === 0) {
			return fail(400, { error: 'Comment cannot be empty' });
		}
		if (content.length > 2000) {
			return fail(400, { error: 'Comment is too long (max 2000 chars)' });
		}

		const { error: err } = await supabase.from('comments').insert({
			project_id: params.id,
			user_id: session.user.id,
			content
		});

		if (err) return fail(500, { error: err.message });
		return { success: true };
	},

	deleteComment: async ({ request, locals: { supabase, session } }) => {
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const commentId = formData.get('id') as string;

		const { error: err } = await supabase
			.from('comments')
			.delete()
			.eq('id', commentId)
			.eq('user_id', session.user.id);

		if (err) return fail(500, { error: err.message });
		return { success: true };
	},

	adopt: async ({ params, locals: { supabase, session } }) => {
		if (!session) return fail(401, { error: 'Not authenticated' });

		const { error: err } = await supabase.from('adoptions').insert({
			project_id: params.id,
			user_id: session.user.id
		});

		if (err) {
			// Unique constraint violation = already adopted
			if (err.code === '23505') return { success: true };
			return fail(500, { error: err.message });
		}

		// Increment the adoption count on the project
		await supabase.rpc('increment_adoption', { p_project_id: params.id });
		return { success: true };
	}
};
