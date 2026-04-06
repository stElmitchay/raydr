import { supabaseAdmin } from './supabase-admin';
import { parseRepoUrl, getRepoInfo, getCommitsSince, getReadmeContent, getLicenseInfo } from './github';
import { analyzeRepoProgress } from './claude';
import { evaluateDPGCompliance } from './dpg';
import { getCurrentDemoCycle } from './demo-cycle';

/**
 * Run a full project analysis: GitHub data → DPG eval → Claude analysis → store results.
 * Can be called from the submit flow (fire-and-forget) or from the analyze page (awaited).
 */
export async function runProjectAnalysis(projectId: string, userId: string): Promise<void> {
	// Fetch project
	const { data: project } = await supabaseAdmin
		.from('projects')
		.select('*')
		.eq('id', projectId)
		.single();

	if (!project?.repo_url) return;

	// Mark as analyzing
	await supabaseAdmin
		.from('projects')
		.update({ analysis_status: 'analyzing' })
		.eq('id', projectId);

	// Get GitHub connection
	const { data: ghConn } = await supabaseAdmin
		.from('github_connections')
		.select('access_token')
		.eq('user_id', userId)
		.single();

	if (!ghConn?.access_token) return;

	const parsed = parseRepoUrl(project.repo_url);
	if (!parsed) return;

	// Get last analysis for "since" date
	const { data: lastAnalysis } = await supabaseAdmin
		.from('ai_analyses')
		.select('id, analyzed_at, milestones')
		.eq('project_id', projectId)
		.order('analyzed_at', { ascending: false })
		.limit(1)
		.single();

	const sinceDate = lastAnalysis
		? new Date(lastAnalysis.analyzed_at)
		: new Date(project.created_at);

	// Get pending next_steps (goals from previous cycle)
	const { data: pendingSteps } = await supabaseAdmin
		.from('next_steps')
		.select('id, title, description, estimated_xp')
		.eq('project_id', projectId)
		.eq('completed', false);

	// Fetch GitHub data in parallel
	const [repoInfo, commits, readmeContent, licenseInfo] = await Promise.all([
		getRepoInfo(ghConn.access_token, parsed.owner, parsed.repo),
		getCommitsSince(ghConn.access_token, parsed.owner, parsed.repo, sinceDate),
		getReadmeContent(ghConn.access_token, parsed.owner, parsed.repo),
		getLicenseInfo(ghConn.access_token, parsed.owner, parsed.repo)
	]);

	// DPG evaluation (optional, don't fail the whole analysis)
	let dpgEvaluation = null;
	let dpgGaps: string[] = [];
	try {
		dpgEvaluation = await evaluateDPGCompliance({
			repoInfo,
			readmeContent,
			licenseInfo,
			projectContext: {
				title: project.title,
				description: project.description,
				problem_statement: project.problem_statement,
				solution_summary: project.solution_summary
			}
		});
		dpgGaps = (dpgEvaluation.checklist || [])
			.filter(c => c.status === 'fail' || c.status === 'partial')
			.map(c => `- ${c.criterion}: ${c.reasoning}`);
	} catch {
		// DPG failed silently
	}

	// Run Claude analysis with pending steps for fulfillment detection
	const analysis = await analyzeRepoProgress({
		commits,
		repoInfo,
		previousAnalysis: lastAnalysis,
		pendingSteps: (pendingSteps ?? []).map(s => ({ title: s.title, description: s.description })),
		projectContext: {
			title: project.title,
			description: project.description,
			problem_statement: project.problem_statement,
			solution_summary: project.solution_summary
		},
		dpgGaps
	});

	// Get season + demo cycle
	const { data: season } = await supabaseAdmin
		.from('seasons')
		.select('*')
		.eq('is_active', true)
		.single();

	const demoCycle = season
		? getCurrentDemoCycle(new Date(season.start_date))
		: (project.demo_cycle || 1);
	const seasonId = season?.id || null;

	// Store analysis
	const { data: storedAnalysis } = await supabaseAdmin.from('ai_analyses').upsert({
		project_id: projectId,
		demo_cycle: demoCycle,
		season: seasonId,
		analysis_json: analysis,
		milestones: analysis.milestones.map(m => m.title),
		xp_awarded: 0,
		commit_count: commits.length,
		lines_changed: commits.reduce((sum, c) => sum + c.additions + c.deletions, 0),
		languages: repoInfo.languages,
		dpg_evaluation: dpgEvaluation
	}, { onConflict: 'project_id,demo_cycle,season' }).select('id').single();

	const analysisId = storedAnalysis?.id;

	// Store milestones
	for (const m of analysis.milestones) {
		await supabaseAdmin.from('milestones').insert({
			project_id: projectId,
			demo_cycle: demoCycle,
			season: seasonId,
			title: m.title,
			description: m.description,
			category: m.category,
			source: 'ai',
			xp_value: m.suggested_xp
		});
	}

	// Mark fulfilled steps as completed and award XP
	if (analysis.fulfilled_step_titles.length > 0 && pendingSteps?.length) {
		for (const step of pendingSteps) {
			if (analysis.fulfilled_step_titles.includes(step.title)) {
				await supabaseAdmin
					.from('next_steps')
					.update({
						completed: true,
						completed_at: new Date().toISOString(),
						fulfilled_by_analysis: analysisId
					})
					.eq('id', step.id);

				// Award XP for fulfilling the step
				await supabaseAdmin.rpc('add_xp', {
					user_id: userId,
					amount: step.estimated_xp
				});
			}
		}
	}

	// Store new next steps (clear old unfulfilled AI-generated ones first)
	if (analysis.next_steps?.length) {
		await supabaseAdmin.from('next_steps')
			.delete()
			.eq('project_id', projectId)
			.eq('completed', false)
			.eq('source', 'ai');

		for (const s of analysis.next_steps) {
			await supabaseAdmin.from('next_steps').insert({
				project_id: projectId,
				analysis_id: analysisId,
				demo_cycle: demoCycle,
				season: seasonId,
				title: s.title,
				description: s.description,
				category: s.category,
				source: 'ai',
				estimated_xp: s.estimated_xp
			});
		}
	}

	// Mark as completed
	await supabaseAdmin
		.from('projects')
		.update({ analysis_status: 'completed' })
		.eq('id', projectId);
}

/**
 * Fire-and-forget wrapper — kicks off analysis without blocking.
 */
export function triggerBackgroundAnalysis(projectId: string, userId: string): void {
	runProjectAnalysis(projectId, userId).catch(async (err) => {
		console.error(`Background analysis failed for project ${projectId}:`, err);
		// Mark as failed so the UI can show the error state
		try {
			await supabaseAdmin
				.from('projects')
				.update({ analysis_status: 'failed' })
				.eq('id', projectId);
		} catch {
			// Ignore failure to update status
		}
	});
}
