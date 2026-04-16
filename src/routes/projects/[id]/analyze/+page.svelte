<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	const project = $derived(data.project);
	const analyses = $derived(data.analyses);
	const milestones = $derived(data.milestones);
	const nextSteps = $derived(data.nextSteps);
	const githubConnected = $derived(data.githubConnected);
	const dpgEvaluation = $derived(data.dpgEvaluation);

	let analyzing = $state(false);

	const latestAnalysis = $derived(analyses[0]);
	const canAwardXp = $derived(latestAnalysis && latestAnalysis.xp_awarded === 0);

	const categoryColors: Record<string, string> = {
		feature: 'tag-primary',
		bugfix: 'tag-danger',
		docs: 'tag-success',
		refactor: 'tag-accent',
		test: 'tag-neutral',
		infra: 'tag-neutral',
		other: 'tag-neutral'
	};
</script>

<div class="max-w-3xl mx-auto space-y-8">
	<a href="/projects/{project.id}" class="inline-flex items-center gap-1.5 glass-card px-3 py-1.5 text-sm text-text-muted hover:text-text hover:bg-white/[0.06] transition-all duration-200">&larr; Back to project</a>

	<div>
		<h1 class="text-3xl font-display font-bold text-text tracking-tighter">AI Progress Analysis</h1>
		<p class="text-sm text-text-muted mt-1">{project.title}</p>
	</div>

	{#if form?.error}
		<div class="glass-card p-3 text-sm text-danger" style="border-color: rgba(239, 68, 68, 0.3);">{form.error}</div>
	{/if}

	{#if !githubConnected}
		<div class="glass-card p-8 text-center space-y-3">
			<p class="text-text-secondary">Connect your GitHub account to analyze repository progress.</p>
			<a href="/auth/github" class="btn-primary px-5 py-2.5 text-sm inline-block">Connect GitHub</a>
		</div>
	{:else if !project.repo_url}
		<div class="glass-card p-8 text-center">
			<p class="text-text-secondary">This project has no repository URL. Add one to enable AI analysis.</p>
		</div>
	{:else}
		<!-- Trigger Analysis -->
		<div class="glass-card p-6">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="text-sm font-display font-semibold text-text">Run Analysis</h3>
					<p class="text-xs text-text-muted mt-0.5">
						AI will analyze your GitHub commits and detect milestones
						{#if latestAnalysis}
							· Last analyzed {new Date(latestAnalysis.analyzed_at).toLocaleDateString()}
						{/if}
					</p>
				</div>
				<form
					method="POST"
					action="?/analyze"
					use:enhance={() => {
						analyzing = true;
						return async ({ update }) => {
							analyzing = false;
							await update();
						};
					}}
				>
					<button type="submit" disabled={analyzing} class="btn-primary px-5 py-2.5 text-sm">
						{analyzing ? 'Analyzing...' : 'Analyze Now'}
					</button>
				</form>
			</div>
		</div>

		<!-- Latest Analysis Result -->
		{#if latestAnalysis}
			{@const json = latestAnalysis.analysis_json as any}
			<div class="glass-card p-6 space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-display font-semibold text-text">Latest Analysis</h3>
					<div class="flex items-center gap-3">
						<span class="text-xs font-mono text-text-muted">{latestAnalysis.commit_count} commits · {latestAnalysis.lines_changed.toLocaleString()} lines changed</span>
						<span class="tag-primary">Quality: {json.quality_score}/10</span>
					</div>
				</div>
				<p class="text-sm text-text-secondary leading-relaxed">{json.summary}</p>

				{#if canAwardXp}
					<div class="flex items-center justify-between glass-card p-4" style="border-color: rgba(139, 92, 246, 0.3);">
						<div>
							<p class="text-sm font-medium text-text">Award {json.total_suggested_xp} XP</p>
							<p class="text-xs text-text-muted">Based on {json.milestones?.length || 0} milestones detected</p>
						</div>
						<form method="POST" action="?/awardXp" use:enhance>
							<input type="hidden" name="analysis_id" value={latestAnalysis.id} />
							<button type="submit" class="btn-primary px-4 py-2 text-sm">Confirm & Award XP</button>
						</form>
					</div>
				{:else if latestAnalysis.xp_awarded > 0}
					<div class="glass-card p-4 text-sm text-success" style="border-color: rgba(34, 197, 94, 0.3);">
						{latestAnalysis.xp_awarded} XP awarded for this analysis
					</div>
				{/if}
			</div>
		{/if}

		<!-- Milestones -->
		{#if milestones.length > 0}
			<div class="glass-card p-6">
				<h3 class="text-sm font-display font-semibold text-text mb-4">Milestones ({milestones.length})</h3>
				<div class="space-y-3">
					{#each milestones as milestone}
						<div class="flex items-start gap-3 glass-card p-4">
							<span class="{categoryColors[milestone.category] || 'tag-neutral'} text-xs shrink-0">
								{milestone.category}
							</span>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-text">{milestone.title}</p>
								{#if milestone.description}
									<p class="text-xs text-text-muted mt-0.5">{milestone.description}</p>
								{/if}
							</div>
							{#if milestone.xp_value > 0}
								<span class="text-xs font-mono text-primary-light shrink-0">+{milestone.xp_value} XP</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- DPG Compliance -->
		{#if dpgEvaluation}
			<div class="glass-card p-6 space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-display font-semibold text-text">DPG Compliance</h3>
					<span class="text-2xl font-bold font-mono {dpgEvaluation.passing_count >= 7 ? 'text-success' : dpgEvaluation.passing_count >= 4 ? 'text-accent-light' : 'text-text-muted'}">
						{dpgEvaluation.passing_count}<span class="text-sm text-text-muted">/9</span>
					</span>
				</div>
				{#if dpgEvaluation.checklist?.length > 0}
					<div class="space-y-2">
						{#each dpgEvaluation.checklist as item}
							<div class="flex items-start gap-3 py-2 border-b border-white/[0.06] last:border-0">
								<span class="shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold
									{item.status === 'pass' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}">
									{item.status === 'pass' ? '✓' : '✗'}
								</span>
								<div class="flex-1 min-w-0">
									<p class="text-sm text-text">{item.criterion}</p>
									<p class="text-xs text-text-muted mt-0.5">{item.evidence || item.recommendation}</p>
								</div>
								<span class="text-xs text-text-muted shrink-0">#{item.indicator}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="glass-card p-6">
				<h3 class="text-sm font-display font-semibold text-text mb-2">DPG Compliance</h3>
				<p class="text-sm text-text-muted">Not yet evaluated. An admin can run the dpg-evaluator skill against this project to generate a DPG assessment.</p>
			</div>
		{/if}

		<!-- Recommended Next Steps -->
		{#if nextSteps.length > 0}
			<div class="glass-card p-6">
				<h3 class="text-sm font-display font-semibold text-text mb-4">Recommended Next Steps</h3>
				<div class="space-y-3">
					{#each nextSteps as step}
						<div class="flex items-start gap-3 p-4 rounded-lg border border-dashed border-white/10 bg-white/[0.02]">
							<span class="{categoryColors[step.category] || 'tag-neutral'} text-xs shrink-0">
								{step.category}
							</span>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-text">{step.title}</p>
								{#if step.description}
									<p class="text-xs text-text-muted mt-0.5">{step.description}</p>
								{/if}
							</div>
							{#if step.estimated_xp > 0}
								<span class="text-xs font-mono text-accent-light shrink-0">~{step.estimated_xp} XP</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Analysis History -->
		{#if analyses.length > 1}
			<div class="glass-card p-6">
				<h3 class="text-sm font-display font-semibold text-text mb-4">Analysis History</h3>
				<div class="space-y-2">
					{#each analyses.slice(1) as analysis}
						{@const json = analysis.analysis_json as any}
						<div class="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
							<div>
								<p class="text-sm text-text">{new Date(analysis.analyzed_at).toLocaleDateString()}</p>
								<p class="text-xs text-text-muted">{analysis.commit_count} commits · Quality {json.quality_score}/10</p>
							</div>
							<span class="text-xs font-mono {analysis.xp_awarded > 0 ? 'text-success' : 'text-text-muted'}">
								{analysis.xp_awarded > 0 ? `+${analysis.xp_awarded} XP` : 'Not awarded'}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
