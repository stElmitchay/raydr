import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { parseRepoUrl } from '$lib/server/github';
import { supabaseAdmin } from '$lib/server/supabase-admin';
import { implementMilestone, generateImplementationPlan, executeImplementationPlan } from '$lib/server/ai-implement';
import { triggerBackgroundAnalysis } from '$lib/server/analyze';
import { adaptDpgStatus } from '$lib/server/dpg-status';

const PROJECT_COLUMNS =
	'id, title, description, problem_statement, solution_summary, project_goals, target_audience, replaces_tool, annual_cost_replaced, estimated_hours_saved_weekly, demo_url, repo_url, screenshot_urls, video_url, tech_stack, ai_tools_used, team_members, submitted_by, season, week, demo_cycle, status, project_type, adoption_count, analysis_status, created_at, updated_at, "dpgStatus", submitter:profiles!submitted_by(id, full_name, avatar_url, department, title)';

export const load: PageServerLoad = async ({ params, locals: { supabase }, parent }) => {
	// Use parent layout's profile to derive isAdmin without an extra query.
	// The layout already exposes session via cookie-only read, so reuse it.
	const { profile: layoutProfile, session } = await parent();
	const isAdmin = !!(layoutProfile as any)?.is_admin;

	// Fire public queries in parallel — project, comments, adoptions, analysis,
	// github connection. Milestones and next_steps are gated behind canManage,
	// so they run in a second batch only when the viewer is allowed to see them.
	const ghConnPromise = session?.user?.id
		? supabase
				.from('github_connections')
				.select('id')
				.eq('user_id', session.user.id)
				.maybeSingle()
		: Promise.resolve({ data: null });

	const [
		{ data: project },
		commentsResult,
		adoptionsResult,
		analysisResult,
		ghConnResult
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
			.from('ai_analyses')
			.select('idea_evaluation, synthesis')
			.eq('project_id', params.id)
			.order('analyzed_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
		ghConnPromise
	]);

	if (!project) {
		throw error(404, 'Project not found');
	}

	const githubConnected = !!ghConnResult.data;

	const userId = session?.user?.id ?? null;
	const isSubmitter = !!userId && (project as any).submitted_by === userId;
	const isTeamMember = !!userId && ((project as any).team_members ?? []).includes(userId);
	const canManage = isSubmitter || isTeamMember || isAdmin;
	const canEdit = isSubmitter || isAdmin;

	const [milestonesResult, nextStepsResult] = canManage
		? await Promise.all([
				supabase
					.from('milestones')
					.select('id, title, description, category, xp_value, source, created_at')
					.eq('project_id', params.id)
					.order('created_at', { ascending: false }),
				supabase
					.from('next_steps')
					.select('id, title, description, category, source, estimated_xp, completed, completed_at, implementation_status, plan_status, implementation_plan, pr_url, done_when, addresses, created_at')
					.eq('project_id', params.id)
					.order('completed', { ascending: true })
					.order('created_at', { ascending: false })
			])
		: [{ data: [] }, { data: [] }];

	// Staleness auto-recovery: fire-and-forget so the user isn't waiting on an
	// admin write just to render the page. The flipped flag is applied locally
	// so the UI shows the correct state.
	if (project.analysis_status === 'analyzing' && project.updated_at) {
		const staleMs = Date.now() - new Date(project.updated_at).getTime();
		if (staleMs > 5 * 60 * 1000) {
			supabaseAdmin
				.from('projects')
				.update({ analysis_status: 'failed', updated_at: new Date().toISOString() })
				.eq('id', project.id)
				.then(() => {});
			(project as any).analysis_status = 'failed';
		}
	}

	// Team members has to wait — it depends on project.team_members.
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
		dpgEvaluation: adaptDpgStatus((project as any).dpgStatus),
		ideaEvaluation: analysisResult.data?.idea_evaluation ?? null,
		synthesis: analysisResult.data?.synthesis ?? null,
		// repoInfo and contributors are now fetched client-side via /projects/[id]/repo-info
		repoInfo: null,
		contributors: null,
		userId,
		isAdmin,
		canManage,
		canEdit,
		githubConnected
	};
};

export const actions: Actions = {
	comment: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
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

	deleteComment: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
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

	adopt: async ({ params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
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

	toggleFeatured: async ({ params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const [{ data: profile }, { data: project }] = await Promise.all([
			supabase.from('profiles').select('is_admin').eq('id', session.user.id).single(),
			supabase.from('projects').select('status').eq('id', params.id).single()
		]);

		if (!profile?.is_admin) return fail(403, { error: 'Only admins can feature projects' });
		if (!project) return fail(404, { error: 'Project not found' });

		const newStatus = project.status === 'featured' ? 'submitted' : 'featured';

		await supabaseAdmin
			.from('projects')
			.update({ status: newStatus })
			.eq('id', params.id);

		return { success: true, featured: newStatus === 'featured' };
	},

	addMilestone: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		// Read form + run all 3 reads in parallel.
		const [
			formData,
			{ data: profile },
			{ data: season },
			{ data: project }
		] = await Promise.all([
			request.formData(),
			supabase.from('profiles').select('is_admin').eq('id', session.user.id).single(),
			supabase.from('seasons').select('id, start_date').eq('is_active', true).maybeSingle(),
			supabase.from('projects').select('demo_cycle').eq('id', params.id).single()
		]);

		if (!profile?.is_admin) return fail(403, { error: 'Only admins can add milestones' });

		const title = (formData.get('title') as string)?.trim();
		const description = (formData.get('description') as string)?.trim() || '';
		const category = formData.get('category') as string;
		const estimated_xp = parseInt(formData.get('estimated_xp') as string) || 50;

		if (!title) return fail(400, { error: 'Title is required' });

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

	retryAnalysis: async ({ params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const [{ data: project }, { data: profile }] = await Promise.all([
			supabase
				.from('projects')
				.select('submitted_by, team_members, repo_url, analysis_status')
				.eq('id', params.id)
				.single(),
			supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
		]);

		if (!project) return fail(404, { error: 'Project not found' });
		if (!project.repo_url) return fail(400, { error: 'No repository URL' });
		const canManage =
			project.submitted_by === session.user.id ||
			(project.team_members ?? []).includes(session.user.id) ||
			!!profile?.is_admin;
		if (!canManage) return fail(403, { error: 'Not your project' });

		await supabaseAdmin
			.from('projects')
			.update({ analysis_status: 'analyzing', updated_at: new Date().toISOString() })
			.eq('id', params.id);

		triggerBackgroundAnalysis(params.id, session.user.id);
		return { success: true };
	},

	updateProject: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		// Edits are stricter than management — only the submitter and admins
		// can change project fields. Team members have read-level management
		// access but shouldn't mutate the project metadata.
		const [{ data: project }, { data: profile }] = await Promise.all([
			supabase.from('projects').select('submitted_by').eq('id', params.id).single(),
			supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
		]);

		if (!project) return fail(404, { error: 'Project not found' });
		const canEdit = project.submitted_by === session.user.id || !!profile?.is_admin;
		if (!canEdit) return fail(403, { error: 'Not your project' });

		const formData = await request.formData();
		const field = formData.get('field') as string;
		const value = (formData.get('value') as string)?.trim() ?? '';

		// Whitelist of editable fields
		const textFields = ['description', 'demo_url', 'repo_url', 'replaces_tool', 'project_goals', 'target_audience'];
		const numberFields = ['annual_cost_replaced', 'estimated_hours_saved_weekly'];
		const arrayFields = ['tech_stack', 'ai_tools_used'];

		if (textFields.includes(field)) {
			const { error: err } = await supabaseAdmin
				.from('projects')
				.update({ [field]: value || null })
				.eq('id', params.id);
			if (err) return fail(500, { error: err.message });
		} else if (numberFields.includes(field)) {
			const { error: err } = await supabaseAdmin
				.from('projects')
				.update({ [field]: Number(value) || 0 })
				.eq('id', params.id);
			if (err) return fail(500, { error: err.message });
		} else if (arrayFields.includes(field)) {
			const arr = value.split(',').map(s => s.trim()).filter(Boolean);
			const { error: err } = await supabaseAdmin
				.from('projects')
				.update({ [field]: arr })
				.eq('id', params.id);
			if (err) return fail(500, { error: err.message });
		} else {
			return fail(400, { error: 'Invalid field' });
		}

		return { success: true, updatedField: field };
	},

	implement: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const stepId = formData.get('step_id') as string;

		if (!stepId) return fail(400, { error: 'Missing step ID' });

		// Step + project + GitHub token + admin check in parallel.
		const [{ data: step }, { data: project }, { data: ghConn }, { data: profile }] = await Promise.all([
			supabaseAdmin.from('next_steps').select('*').eq('id', stepId).single(),
			supabase.from('projects').select('repo_url, submitted_by, team_members, title, description, tech_stack').eq('id', params.id).single(),
			supabase.from('github_connections').select('access_token').eq('user_id', session.user.id).maybeSingle(),
			supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
		]);

		if (!step) return fail(404, { error: 'Step not found' });
		if (!project?.repo_url) return fail(400, { error: 'No repository URL' });
		const canManage =
			project.submitted_by === session.user.id ||
			(project.team_members ?? []).includes(session.user.id) ||
			!!profile?.is_admin;
		if (!canManage) return fail(403, { error: 'Not your project' });
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
	},

	planImplementation: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const stepId = formData.get('step_id') as string;

		if (!stepId) return fail(400, { error: 'Missing step ID' });

		const [{ data: step }, { data: project }, { data: ghConn }, { data: profile }] = await Promise.all([
			supabaseAdmin.from('next_steps').select('*').eq('id', stepId).single(),
			supabase.from('projects').select('repo_url, submitted_by, team_members, title, description, tech_stack').eq('id', params.id).single(),
			supabase.from('github_connections').select('access_token').eq('user_id', session.user.id).maybeSingle(),
			supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
		]);

		if (!step) return fail(404, { error: 'Step not found' });
		if (!project?.repo_url) return fail(400, { error: 'No repository URL' });
		const canManage =
			project.submitted_by === session.user.id ||
			(project.team_members ?? []).includes(session.user.id) ||
			!!profile?.is_admin;
		if (!canManage) return fail(403, { error: 'Not your project' });
		if (!ghConn) return fail(400, { error: 'GitHub not connected' });

		const parsed = parseRepoUrl(project.repo_url);
		if (!parsed) return fail(400, { error: 'Invalid repository URL' });

		// Mark as planning
		await supabaseAdmin
			.from('next_steps')
			.update({ plan_status: 'planning' })
			.eq('id', stepId);

		try {
			const plan = await generateImplementationPlan({
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

			// Store plan on the step
			await supabaseAdmin
				.from('next_steps')
				.update({
					implementation_plan: plan,
					plan_status: 'ready'
				})
				.eq('id', stepId);

			return { success: true, plan };
		} catch (err: any) {
			await supabaseAdmin
				.from('next_steps')
				.update({ plan_status: 'failed' })
				.eq('id', stepId);

			return fail(500, { error: `Planning failed: ${err.message}` });
		}
	},

	approveImplementation: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const stepId = formData.get('step_id') as string;

		if (!stepId) return fail(400, { error: 'Missing step ID' });

		const [{ data: step }, { data: project }, { data: ghConn }, { data: profile }] = await Promise.all([
			supabaseAdmin.from('next_steps').select('*').eq('id', stepId).single(),
			supabase.from('projects').select('repo_url, submitted_by, team_members, title, description, tech_stack').eq('id', params.id).single(),
			supabase.from('github_connections').select('access_token').eq('user_id', session.user.id).maybeSingle(),
			supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
		]);

		if (!step) return fail(404, { error: 'Step not found' });
		if (!step.implementation_plan) return fail(400, { error: 'No plan to approve' });
		if (!project?.repo_url) return fail(400, { error: 'No repository URL' });
		const canManage =
			project.submitted_by === session.user.id ||
			(project.team_members ?? []).includes(session.user.id) ||
			!!profile?.is_admin;
		if (!canManage) return fail(403, { error: 'Not your project' });
		if (!ghConn) return fail(400, { error: 'GitHub not connected' });

		const parsed = parseRepoUrl(project.repo_url);
		if (!parsed) return fail(400, { error: 'Invalid repository URL' });

		// Mark as implementing
		await supabaseAdmin
			.from('next_steps')
			.update({ implementation_status: 'in_progress', plan_status: 'approved' })
			.eq('id', stepId);

		try {
			const pr = await executeImplementationPlan(
				{
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
				},
				step.implementation_plan
			);

			await supabaseAdmin
				.from('next_steps')
				.update({
					implementation_status: 'implemented',
					pr_url: pr.html_url
				})
				.eq('id', stepId);

			return { success: true, prUrl: pr.html_url, prNumber: pr.number };
		} catch (err: any) {
			await supabaseAdmin
				.from('next_steps')
				.update({ implementation_status: 'failed', plan_status: 'failed' })
				.eq('id', stepId);

			return fail(500, { error: `Implementation failed: ${err.message}` });
		}
	},

	rejectPlan: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const stepId = formData.get('step_id') as string;

		if (!stepId) return fail(400, { error: 'Missing step ID' });

		const [{ data: project }, { data: profile }] = await Promise.all([
			supabase.from('projects').select('submitted_by, team_members').eq('id', params.id).single(),
			supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
		]);

		if (!project) return fail(404, { error: 'Project not found' });
		const canManage =
			project.submitted_by === session.user.id ||
			(project.team_members ?? []).includes(session.user.id) ||
			!!profile?.is_admin;
		if (!canManage) return fail(403, { error: 'Not your project' });

		await supabaseAdmin
			.from('next_steps')
			.update({ implementation_plan: null, plan_status: null })
			.eq('id', stepId);

		return { success: true };
	}
};
