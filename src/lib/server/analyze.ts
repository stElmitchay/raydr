import { supabaseAdmin } from './supabase-admin';
import {
	parseRepoUrl,
	getRepoInfo,
	getCommitsSince,
	getReadmeContent,
	getLicenseInfo,
	getCompareData,
	getRepoTreeWithSizes,
	getSampleFiles,
	type TreeEntry
} from './github';
import { analyzeRepoProgress } from './claude';
import { evaluateIdea } from './idea-eval';
import { synthesizeEvaluations } from './synthesis';
import { adaptDpgStatus } from './dpg-status';
import { getCurrentDemoCycle } from './demo-cycle';

/**
 * Run a full project analysis: GitHub data → DPG eval + Idea eval (parallel) → Progress analysis → Synthesis → store results.
 * Can be called from the submit flow (fire-and-forget) or from the analyze page (awaited).
 */
export async function runProjectAnalysis(projectId: string, userId: string): Promise<void> {
	// All four startup reads in parallel + the analyzing-status flag write.
	const [
		{ data: project },
		{ data: ghConn },
		{ data: lastAnalysis },
		{ data: pendingSteps }
	] = await Promise.all([
		supabaseAdmin
			.from('projects')
			.select('id, repo_url, title, description, problem_statement, solution_summary, project_goals, target_audience, tech_stack, project_type, demo_cycle, created_at, "dpgStatus"')
			.eq('id', projectId)
			.single(),
		supabaseAdmin
			.from('github_connections')
			.select('access_token')
			.eq('user_id', userId)
			.maybeSingle(),
		supabaseAdmin
			.from('ai_analyses')
			.select('id, analyzed_at, milestones, commit_sha')
			.eq('project_id', projectId)
			.order('analyzed_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
		supabaseAdmin
			.from('next_steps')
			.select('id, title, description, estimated_xp')
			.eq('project_id', projectId)
			.eq('completed', false),
		supabaseAdmin
			.from('projects')
			.update({ analysis_status: 'analyzing', updated_at: new Date().toISOString() })
			.eq('id', projectId)
	]);

	if (!project?.repo_url) return;

	try {
		if (!ghConn?.access_token) throw new Error('GitHub not connected — no access token found');

		const parsed = parseRepoUrl(project.repo_url);
		if (!parsed) throw new Error('Invalid repository URL');

		const sinceDate = lastAnalysis
			? new Date(lastAnalysis.analyzed_at)
			: new Date(project.created_at);

		// Fetch GitHub data in parallel — including new code-reading capabilities
		const [repoInfo, commits, readmeContent, licenseInfo] = await Promise.all([
			getRepoInfo(ghConn.access_token, parsed.owner, parsed.repo),
			getCommitsSince(ghConn.access_token, parsed.owner, parsed.repo, sinceDate),
			getReadmeContent(ghConn.access_token, parsed.owner, parsed.repo),
			getLicenseInfo(ghConn.access_token, parsed.owner, parsed.repo)
		]);

		// File tree and code diff are independent — fetch in parallel.
		// (sample-files still depends on the tree; that chain stays sequential.)
		const compareDiffPromise: Promise<string> = (async () => {
			const headSha = commits.length > 0 ? commits[0].sha : null;
			let baseSha: string | null = null;
			if (lastAnalysis?.commit_sha && headSha) {
				baseSha = lastAnalysis.commit_sha;
			} else if (commits.length > 0) {
				baseSha = commits[commits.length - 1].sha;
			}
			if (!baseSha || !headSha || baseSha === headSha) return '';
			try {
				const compareData = await getCompareData(
					ghConn.access_token,
					parsed.owner,
					parsed.repo,
					baseSha,
					headSha
				);
				return compareData.diff;
			} catch {
				return '';
			}
		})();

		const headSha = commits.length > 0 ? commits[0].sha : null;

		const [fileTree, codeDiffs] = await Promise.all([
			getRepoTreeWithSizes(
				ghConn.access_token,
				parsed.owner,
				parsed.repo,
				repoInfo.default_branch
			),
			compareDiffPromise
		]);

		const keyFiles = await getSampleFiles(
			ghConn.access_token,
			parsed.owner,
			parsed.repo,
			fileTree
		);

		// DPG analysis is owned by the dpg-evaluator skill, which writes to
		// projects.dpgStatus out-of-band. We just consume whatever it last
		// wrote. Null means "not yet evaluated"; downstream stages handle it.
		const dpgEvaluation = adaptDpgStatus((project as any).dpgStatus);

		// DPG gaps for progress analysis context
		const dpgGapsList: string[] = [];
		if (dpgEvaluation) {
			for (const c of dpgEvaluation.checklist) {
				if (c.status === 'fail') {
					dpgGapsList.push(`- Criterion ${c.indicator} (${c.criterion}): ${c.recommendation}`);
				}
			}
		}

		const ideaEvaluation = await evaluateIdea({
			projectContext: {
				title: project.title,
				description: project.description,
				problem_statement: project.problem_statement,
				solution_summary: project.solution_summary,
				project_goals: project.project_goals,
				target_audience: project.target_audience,
				tech_stack: project.tech_stack,
				project_type: project.project_type
			}
		}).catch(() => null);

		// Run progress analysis with actual code diffs
		const fileTreePaths = fileTree.map((f) => f.path);
		const analysis = await analyzeRepoProgress({
			commits,
			repoInfo,
			codeDiffs,
			fileTree: fileTreePaths,
			keyFileContents: keyFiles,
			previousAnalysis: lastAnalysis,
			pendingSteps: (pendingSteps ?? []).map((s) => ({ title: s.title, description: s.description })),
			projectContext: {
				title: project.title,
				description: project.description,
				problem_statement: project.problem_statement,
				solution_summary: project.solution_summary
			},
			dpgGaps: dpgGapsList
		});

		// Synthesis — sole source of next steps
		let synthesis = null;
		try {
			synthesis = await synthesizeEvaluations({
				ideaEval: ideaEvaluation,
				dpgEval: dpgEvaluation,
				progressAnalysis: analysis,
				existingUnfulfilledSteps: (pendingSteps ?? []).map((s) => ({
					title: s.title,
					description: s.description
				})),
				projectContext: {
					title: project.title,
					description: project.description,
					problem_statement: project.problem_statement,
					solution_summary: project.solution_summary
				}
			});
		} catch {
			// Synthesis failed — no new next steps this cycle, existing ones persist
		}

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
			milestones: analysis.milestones.map((m) => m.title),
			xp_awarded: 0,
			commit_count: commits.length,
			commit_sha: headSha,
			lines_changed: commits.reduce((sum, c) => sum + c.additions + c.deletions, 0),
			languages: repoInfo.languages,
			idea_evaluation: ideaEvaluation,
			synthesis: synthesis
		}, { onConflict: 'project_id,demo_cycle,season' }).select('id').single();

		const analysisId = storedAnalysis?.id;

		// Store milestones — batch insert, one round-trip.
		if (analysis.milestones.length > 0) {
			await supabaseAdmin.from('milestones').insert(
				analysis.milestones.map((m) => ({
					project_id: projectId,
					demo_cycle: demoCycle,
					season: seasonId,
					title: m.title,
					description: m.description,
					category: m.category,
					source: 'ai',
					xp_value: m.suggested_xp
				}))
			);
		}

		// Mark fulfilled steps as completed and award XP — one bulk update + one RPC.
		if (analysis.fulfilled_step_titles.length > 0 && pendingSteps?.length) {
			const fulfilled = pendingSteps.filter((step) =>
				analysis.fulfilled_step_titles.includes(step.title)
			);
			if (fulfilled.length > 0) {
				await supabaseAdmin
					.from('next_steps')
					.update({
						completed: true,
						completed_at: new Date().toISOString(),
						fulfilled_by_analysis: analysisId
					})
					.in('id', fulfilled.map((s) => s.id));

				const totalXp = fulfilled.reduce((sum, s) => sum + (s.estimated_xp ?? 0), 0);
				if (totalXp > 0) {
					await supabaseAdmin.rpc('add_xp', { user_id: userId, amount: totalXp });
				}
			}
		}

		// Add NEW next steps from synthesis (don't delete existing unfulfilled ones) — batch insert.
		if (synthesis?.priority_milestones?.length) {
			const existingTitles = new Set(
				(pendingSteps ?? [])
					.filter((s) => !analysis.fulfilled_step_titles.includes(s.title))
					.map((s) => s.title.toLowerCase().trim())
			);

			const rows: any[] = [];
			for (const s of synthesis.priority_milestones) {
				const normalizedTitle = s.title.toLowerCase().trim();
				if (existingTitles.has(normalizedTitle)) continue;
				rows.push({
					project_id: projectId,
					analysis_id: analysisId,
					demo_cycle: demoCycle,
					season: seasonId,
					title: s.title,
					description: s.description,
					done_when: s.done_when || null,
					addresses: s.addresses || null,
					category: s.category,
					source: 'ai',
					estimated_xp: s.estimated_xp
				});
				existingTitles.add(normalizedTitle);
			}

			if (rows.length > 0) {
				await supabaseAdmin.from('next_steps').insert(rows);
			}
		}

		// Mark as completed
		await supabaseAdmin
			.from('projects')
			.update({ analysis_status: 'completed', updated_at: new Date().toISOString() })
			.eq('id', projectId);
	} catch (err) {
		// Reset status so the project isn't stuck in 'analyzing' forever
		await supabaseAdmin
			.from('projects')
			.update({ analysis_status: 'failed', updated_at: new Date().toISOString() })
			.eq('id', projectId);
		throw err;
	}
}

/**
 * Fire-and-forget wrapper — kicks off analysis without blocking.
 */
export function triggerBackgroundAnalysis(projectId: string, userId: string): void {
	runProjectAnalysis(projectId, userId).catch(async (err) => {
		console.error(`Background analysis failed for project ${projectId}:`, err);
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
