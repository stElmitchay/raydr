import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { parseRepoUrl } from '$lib/server/github';
import { supabaseAdmin } from '$lib/server/supabase-admin';
import { implementMilestone } from '$lib/server/ai-implement';

const PROJECT_COLUMNS =
	'id, title, description, problem_statement, solution_summary, project_goals, target_audience, replaces_tool, annual_cost_replaced, estimated_hours_saved_weekly, demo_url, repo_url, screenshot_urls, video_url, tech_stack, ai_tools_used, team_members, submitted_by, season, week, demo_cycle, status, project_type, adoption_count, analysis_status, created_at, updated_at, submitter:profiles!submitted_by(id, full_name, avatar_url, department, title)';

export const load: PageServerLoad = async ({ params, locals: { supabase, session }, parent }) => {
	// Use parent layout's profile to derive isAdmin without an extra query.
	const { profile: layoutProfile } = await parent();
	const isAdmin = !!(layoutProfile as any)?.is_admin;

	// Fire ALL queries in parallel — including the project itself.
	const [
		{ data: project },
		commentsResult,
		adoptionsResult,
		milestonesResult,
		nextStepsResult,
		analysisResult
	] = await Promise.all([
		supabase.from('projects').select(PROJECT_COLUMNS).eq('id', params.id).single(),
		supabase
			.from('comments')
			.select('id, content, created_at, user_id, commenter:profiles!user_id(id, full_name, avatar_url)')
			.eq('project_id', params.id)
			.order('created_at', { ascending: true }),
		supabase
			.from('adoptions')
			.select('id, user_id, adopted_at, adopter:profiles!user_id(id, full_name, avatar_url)')
			.eq('project_id', params.id),
		supabase
			.from('milestones')
			.select('id, title, description, category, xp_value, source, created_at')
			.eq('project_id', params.id)
			.order('created_at', { ascending: false }),
		supabase
			.from('next_steps')
			.select('id, title, description, category, source, estimated_xp, completed, completed_at, implementation_status, pr_url, created_at')
			.eq('project_id', params.id)
			.order('completed', { ascending: true })
			.order('created_at', { ascending: false }),
		supabase
			.from('ai_analyses')
			.select('dpg_evaluation, idea_evaluation, synthesis')
			.eq('project_id', params.id)
			.order('analyzed_at', { ascending: false })
			.limit(1)
			.maybeSingle()
	]);

	if (!project) {
		throw error(404, 'Project not found');
	}

	// Team members — only fetch if needed (after we know the project exists)
	const teamMembers =
		(project as any).team_members?.length > 0
			? (
					await supabase
						.from('profiles')
						.select('id, full_name, avatar_url, department')
						.in('id', (project as any).team_members)
				).data ?? []
			: [];

	return {
		project,
		teamMembers,
		comments: commentsResult.data ?? [],
		adoptions: adoptionsResult.data ?? [],
		milestones: milestonesResult.data ?? [],
		nextSteps: nextStepsResult.data ?? [],
		dpgEvaluation: analysisResult.data?.dpg_evaluation ?? null,
		ideaEvaluation: analysisResult.data?.idea_evaluation ?? null,
		synthesis: analysisResult.data?.synthesis ?? null,
		// repoInfo and contributors are now fetched client-side via /projects/[id]/repo-info
		repoInfo: null,
		contributors: null,
		userId: session?.user?.id ?? null,
		isAdmin
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
			if (err.code === '23505') return { success: true };
			return fail(500, { error: err.message });
		}

		await supabase.rpc('increment_adoption', { p_project_id: params.id });
		return { success: true };
	},

	toggleFeatured: async ({ params, locals: { supabase, session } }) => {
		if (!session) return fail(401, { error: 'Not authenticated' });

		const { data: profile } = await supabase
			.from('profiles')
			.select('is_admin')
			.eq('id', session.user.id)
			.single();

		if (!profile?.is_admin) return fail(403, { error: 'Only admins can feature projects' });

		const { data: project } = await supabase
			.from('projects')
			.select('status')
			.eq('id', params.id)
			.single();

		if (!project) return fail(404, { error: 'Project not found' });

		const newStatus = project.status === 'featured' ? 'submitted' : 'featured';

		await supabaseAdmin
			.from('projects')
			.update({ status: newStatus })
			.eq('id', params.id);

		return { success: true, featured: newStatus === 'featured' };
	},

	addMilestone: async ({ request, params, locals: { supabase, session } }) => {
		if (!session) return fail(401, { error: 'Not authenticated' });

		// Check admin
		const { data: profile } = await supabase
			.from('profiles')
			.select('is_admin')
			.eq('id', session.user.id)
			.single();

		if (!profile?.is_admin) return fail(403, { error: 'Only admins can add milestones' });

		const formData = await request.formData();
		const title = (formData.get('title') as string)?.trim();
		const description = (formData.get('description') as string)?.trim() || '';
		const category = formData.get('category') as string;
		const estimated_xp = parseInt(formData.get('estimated_xp') as string) || 50;

		if (!title) return fail(400, { error: 'Title is required' });

		const { data: season } = await supabase
			.from('seasons')
			.select('id, start_date')
			.eq('is_active', true)
			.single();

		const { data: project } = await supabase
			.from('projects')
			.select('demo_cycle')
			.eq('id', params.id)
			.single();

		await supabaseAdmin.from('next_steps').insert({
			project_id: params.id,
			demo_cycle: project?.demo_cycle || 1,
			season: season?.id || null,
			title,
			description,
			category: category || 'feature',
			source: 'manual',
			estimated_xp: Math.min(200, Math.max(10, estimated_xp))
		});

		return { success: true };
	},

	implement: async ({ request, params, locals: { supabase, session } }) => {
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const stepId = formData.get('step_id') as string;

		if (!stepId) return fail(400, { error: 'Missing step ID' });

		// Get the step
		const { data: step } = await supabaseAdmin
			.from('next_steps')
			.select('*')
			.eq('id', stepId)
			.single();

		if (!step) return fail(404, { error: 'Step not found' });

		// Get project
		const { data: project } = await supabase
			.from('projects')
			.select('*')
			.eq('id', params.id)
			.single();

		if (!project?.repo_url) return fail(400, { error: 'No repository URL' });
		if (project.submitted_by !== session.user.id) return fail(403, { error: 'Not your project' });

		// Get GitHub token
		const { data: ghConn } = await supabase
			.from('github_connections')
			.select('access_token')
			.eq('user_id', session.user.id)
			.single();

		if (!ghConn) return fail(400, { error: 'GitHub not connected' });

		const parsed = parseRepoUrl(project.repo_url);
		if (!parsed) return fail(400, { error: 'Invalid repository URL' });

		// Mark as in progress
		await supabaseAdmin
			.from('next_steps')
			.update({ implementation_status: 'in_progress' })
			.eq('id', stepId);

		try {
			const pr = await implementMilestone({
				token: ghConn.access_token,
				owner: parsed.owner,
				repo: parsed.repo,
				milestone: {
					title: step.title,
					description: step.description,
					category: step.category
				},
				projectContext: {
					title: project.title,
					description: project.description,
					tech_stack: project.tech_stack || []
				}
			});

			// Mark as implemented with PR link
			await supabaseAdmin
				.from('next_steps')
				.update({
					implementation_status: 'implemented',
					pr_url: pr.html_url
				})
				.eq('id', stepId);

			return { success: true, prUrl: pr.html_url, prNumber: pr.number };
		} catch (err: any) {
			// Mark as failed
			await supabaseAdmin
				.from('next_steps')
				.update({ implementation_status: 'failed' })
				.eq('id', stepId);

			return fail(500, { error: `Implementation failed: ${err.message}` });
		}
	}
};
