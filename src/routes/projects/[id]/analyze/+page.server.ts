import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabaseAdmin } from '$lib/server/supabase-admin';
import { runProjectAnalysis } from '$lib/server/analyze';
import { AI_XP_CAP_PER_CYCLE } from '$lib/constants';

export const load: PageServerLoad = async ({ params, locals: { supabase, session } }) => {
	if (!session) throw redirect(303, '/auth/login');

	const { data: project } = await supabase
		.from('projects')
		.select('*, submitter:profiles!submitted_by(*)')
		.eq('id', params.id)
		.single();

	if (!project) throw error(404, 'Project not found');
	if (project.submitted_by !== session.user.id) throw error(403, 'Only the project owner can analyze');

	const [{ data: ghConn }, { data: analyses }, { data: milestones }, { data: nextSteps }] = await Promise.all([
		supabase.from('github_connections').select('*').eq('user_id', session.user.id).single(),
		supabase.from('ai_analyses').select('*').eq('project_id', params.id).order('analyzed_at', { ascending: false }),
		supabase.from('milestones').select('*').eq('project_id', params.id).order('created_at', { ascending: false }),
		supabase.from('next_steps').select('*').eq('project_id', params.id).order('created_at', { ascending: false })
	]);

	return {
		project,
		githubConnected: !!ghConn,
		analyses: analyses ?? [],
		milestones: milestones ?? [],
		nextSteps: nextSteps ?? []
	};
};

export const actions: Actions = {
	analyze: async ({ params, locals: { supabase, session } }) => {
		if (!session) return fail(401, { error: 'Not authenticated' });

		const { data: project } = await supabase
			.from('projects')
			.select('*')
			.eq('id', params.id)
			.single();

		if (!project) return fail(404, { error: 'Project not found' });
		if (project.submitted_by !== session.user.id) return fail(403, { error: 'Not your project' });
		if (!project.repo_url) return fail(400, { error: 'No repository URL on this project' });

		const { data: ghConn } = await supabase
			.from('github_connections')
			.select('access_token')
			.eq('user_id', session.user.id)
			.single();

		if (!ghConn) return fail(400, { error: 'GitHub not connected. Go to your profile to connect.' });

		try {
			await runProjectAnalysis(params.id, session.user.id);
			return { success: true };
		} catch (err: any) {
			return fail(500, { error: `Analysis failed: ${err.message}` });
		}
	},

	awardXp: async ({ params, request, locals: { supabase, session } }) => {
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const analysisId = formData.get('analysis_id') as string;

		const { data: analysis } = await supabaseAdmin
			.from('ai_analyses')
			.select('*')
			.eq('id', analysisId)
			.single();

		if (!analysis) return fail(404, { error: 'Analysis not found' });
		if (analysis.xp_awarded > 0) return fail(400, { error: 'XP already awarded for this analysis' });

		const xpToAward = Math.min(
			AI_XP_CAP_PER_CYCLE,
			(analysis.analysis_json as any).total_suggested_xp || 0
		);

		await supabaseAdmin.rpc('award_analysis_xp', {
			p_user_id: session.user.id,
			p_project_id: params.id,
			p_amount: xpToAward,
			p_demo_cycle: analysis.demo_cycle,
			p_season: analysis.season
		});

		return { success: true, xpAwarded: xpToAward };
	}
};
