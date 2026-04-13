<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

	let { data } = $props();
	const project = $derived(data.project);
	const teamMembers = $derived(data.teamMembers);
	const comments = $derived(data.comments);
	const adoptions = $derived(data.adoptions);
	const nextSteps = $derived(data.nextSteps);
	const dpgEvaluation = $derived(data.dpgEvaluation);
	const ideaEvaluation = $derived(data.ideaEvaluation);
	const synthesis = $derived(data.synthesis);
	const userId = $derived(data.userId);
	const isOwner = $derived(userId === project.submitted_by);
	const isAdmin = $derived(data.isAdmin);
	const githubConnected = $derived(data.githubConnected);

	let retryingAnalysis = $state(false);

	// GitHub repo info is fetched client-side after mount so it doesn't block the
	// initial page render. Shows a loading state, then fades in once the API call
	// returns. The /repo-info endpoint handles the GitHub API calls server-side.
	let repoInfo = $state<any>(null);
	let contributors = $state<any[] | null>(null);
	let repoLoading = $state(false);

	onMount(async () => {
		if (!project.repo_url || !userId) return;
		repoLoading = true;
		try {
			const res = await fetch(`/projects/${project.id}/repo-info`);
			if (res.ok) {
				const json = await res.json();
				repoInfo = json.repoInfo;
				contributors = json.contributors;
			}
		} catch {
			// silent fail — repoInfo stays null
		} finally {
			repoLoading = false;
		}
	});

	const pendingSteps = $derived(nextSteps.filter(s => !s.completed));
	const fulfilledSteps = $derived(nextSteps.filter(s => s.completed));

	let implementing = $state<string | null>(null);
	let planning = $state<string | null>(null);
	let showAddMilestone = $state(false);
	let editingField = $state<string | null>(null);
	let editValue = $state('');
	let savingField = $state(false);

	function startEdit(field: string, currentValue: string | number | string[] | null) {
		editingField = field;
		if (Array.isArray(currentValue)) {
			editValue = currentValue.join(', ');
		} else {
			editValue = String(currentValue ?? '');
		}
	}

	function cancelEdit() {
		editingField = null;
		editValue = '';
	}
	const hasAdopted = $derived(adoptions.some((a: any) => a.user_id === userId));

	function timeAgo(dateStr: string): string {
		const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 30) return `${days}d ago`;
		return `${Math.floor(days / 30)}mo ago`;
	}

	let commentText = $state('');
	let submittingComment = $state(false);
	let lightboxUrl = $state<string | null>(null);

	function getEmbedUrl(url: string): string | null {
		let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
		if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
		match = url.match(/loom\.com\/share\/([\w-]+)/);
		if (match) return `https://www.loom.com/embed/${match[1]}`;
		return null;
	}
</script>

<div class="px-5 sm:px-6 md:px-10 lg:px-16 py-10 sm:py-12 max-w-5xl mx-auto">
	<!-- Back -->
	<a href="/projects" class="text-sm text-text-muted link-draw inline-block mb-8 sm:mb-10 animate-fade-up stagger-1">&larr; Projects</a>

	<!-- Title -->
	<div class="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-6 mb-6 animate-fade-up stagger-1">
		<h1 class="heading-display text-[clamp(2rem,7vw,4rem)] text-text">{project.title}</h1>
		<div class="flex items-center flex-wrap gap-3 flex-shrink-0 sm:pt-3">
			{#if dpgEvaluation}
				<span class="tag">{dpgEvaluation.passing_count}/9 DPG</span>
			{/if}
			{#if project.status === 'featured'}
				<span class="tag-featured">Featured</span>
			{/if}
			{#if isAdmin}
				<form method="POST" action="?/toggleFeatured" use:enhance>
					<button type="submit" class="text-xs text-text-muted link-draw">
						{project.status === 'featured' ? 'Unfeature' : 'Feature'}
					</button>
				</form>
			{/if}
		</div>
	</div>

	<div class="max-w-3xl mb-10 sm:mb-12 animate-fade-up stagger-2">
		{#if editingField === 'description'}
			<form method="POST" action="?/updateProject" use:enhance={() => {
				savingField = true;
				return async ({ update }) => { savingField = false; editingField = null; await update(); };
			}}>
				<input type="hidden" name="field" value="description" />
				<textarea name="value" bind:value={editValue} rows="3" class="input-box w-full text-base mb-3"></textarea>
				<div class="flex gap-3">
					<button type="submit" disabled={savingField} class="text-sm text-text link-draw">{savingField ? 'Saving…' : 'Save'}</button>
					<button type="button" onclick={cancelEdit} class="text-sm text-text-muted link-draw">Cancel</button>
				</div>
			</form>
		{:else}
			<p class="text-body">{project.description}</p>
			{#if isOwner}
				<button onclick={() => startEdit('description', project.description)} class="text-xs text-text-muted link-draw mt-2">Edit</button>
			{/if}
		{/if}
	</div>

	<!-- AI Tools Survey — shown to owner if not yet filled in -->
	{#if isOwner && (!project.ai_tools_used || project.ai_tools_used.length === 0) && editingField !== 'ai_tools_used'}
		<div class="border border-border bg-surface-alt px-5 py-4 mb-10 sm:mb-12 animate-fade-up stagger-2">
			<form method="POST" action="?/updateProject" use:enhance={() => {
				savingField = true;
				return async ({ update }) => { savingField = false; await update(); };
			}} class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
				<input type="hidden" name="field" value="ai_tools_used" />
				<p class="text-sm text-text-secondary shrink-0">Which AI tools did you use?</p>
				<input name="value" type="text" placeholder="e.g., Claude, Cursor, Copilot" class="flex-1 bg-transparent border-0 border-b border-border focus:border-text outline-none text-sm text-text py-1 w-full sm:w-auto" />
				<button type="submit" disabled={savingField} class="text-sm text-text link-draw shrink-0">{savingField ? 'Saving…' : 'Save'}</button>
			</form>
		</div>
	{/if}

	<!-- Analysis Summary (Synthesis) -->
	{#if synthesis}
		<ScrollReveal>
			<div class="border-t border-border pt-8 sm:pt-10 mb-10 sm:mb-12">
				<h3 class="heading-section mb-6">Analysis Summary</h3>
				<p class="font-serif italic text-xl sm:text-2xl md:text-3xl text-text leading-snug max-w-4xl mb-8 sm:mb-10">"{synthesis.summary}"</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
					{#if synthesis.strengths?.length}
						<div>
							<h4 class="heading-section mb-4 text-positive">What's Working</h4>
							<ul class="space-y-3">
								{#each synthesis.strengths as item}
									<li class="text-base text-text-secondary leading-relaxed flex gap-3">
										<span class="text-positive shrink-0 mt-1">✓</span>
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if synthesis.critical_gaps?.length}
						<div>
							<h4 class="heading-section mb-4 text-negative">Critical Gaps</h4>
							<ul class="space-y-3">
								{#each synthesis.critical_gaps as item}
									<li class="text-base text-text-secondary leading-relaxed flex gap-3">
										<span class="text-negative shrink-0 mt-1">!</span>
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</div>
		</ScrollReveal>
	{/if}

	<!-- Metrics Row -->
	<ScrollReveal>
		<div class="grid grid-cols-3 gap-px bg-border border-t border-b border-border mb-10 sm:mb-12">
			<div class="bg-bg py-6 sm:py-8 px-2 text-center">
				<p class="text-data text-2xl sm:text-3xl text-positive">${((project.annual_cost_replaced ?? 0) / 1000).toFixed(0)}K</p>
				<p class="heading-section mt-2">Saved / year</p>
			</div>
			<div class="bg-bg py-6 sm:py-8 px-2 text-center">
				<p class="text-data text-2xl sm:text-3xl text-text">{project.estimated_hours_saved_weekly ?? 0}h</p>
				<p class="heading-section mt-2">Saved / week</p>
			</div>
			<div class="bg-bg py-6 sm:py-8 px-2 text-center">
				<p class="text-data text-2xl sm:text-3xl text-text">{project.adoption_count ?? 0}</p>
				<p class="heading-section mt-2">Adoptions</p>
			</div>
		</div>
	</ScrollReveal>

	<!-- Idea Evaluation -->
	{#if ideaEvaluation}
		<ScrollReveal>
			<div class="border-t border-border pt-10 mb-12">
				<div class="flex items-baseline justify-between mb-6">
					<h3 class="heading-section">Idea Evaluation</h3>
					<span class="text-data text-2xl text-text">{ideaEvaluation.overall_score}<span class="text-sm text-text-muted">/100</span></span>
				</div>

				<p class="font-serif italic text-lg sm:text-xl text-text mb-6 sm:mb-8 max-w-3xl leading-snug">"{ideaEvaluation.one_line_verdict}"</p>

				<!-- Score breakdown -->
				<div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
					{#each Object.entries(ideaEvaluation.scores) as [key, score] (key)}
						{@const numScore = score as number}
						<div class="border border-border p-4">
							<div class="flex items-baseline justify-between mb-2">
								<span class="heading-section">{key.replace(/_/g, ' ')}</span>
								<span class="text-data text-base text-text">{numScore}<span class="text-xs text-text-muted">/10</span></span>
							</div>
							<div class="h-1 bg-surface-alt overflow-hidden">
								<div class="h-full bg-text" style="width: {numScore * 10}%"></div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Strengths / Concerns / Recommendations -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
					{#if ideaEvaluation.strengths?.length}
						<div>
							<h4 class="heading-section mb-3 text-positive">Strengths</h4>
							<ul class="space-y-2">
								{#each ideaEvaluation.strengths as item}
									<li class="text-sm text-text-secondary leading-relaxed flex gap-2">
										<span class="text-positive shrink-0">+</span>
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if ideaEvaluation.concerns?.length}
						<div>
							<h4 class="heading-section mb-3 text-negative">Concerns</h4>
							<ul class="space-y-2">
								{#each ideaEvaluation.concerns as item}
									<li class="text-sm text-text-secondary leading-relaxed flex gap-2">
										<span class="text-negative shrink-0">−</span>
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if ideaEvaluation.recommendations?.length}
						<div>
							<h4 class="heading-section mb-3">Recommendations</h4>
							<ul class="space-y-2">
								{#each ideaEvaluation.recommendations as item}
									<li class="text-sm text-text-secondary leading-relaxed flex gap-2">
										<span class="text-text-muted shrink-0">→</span>
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</div>
		</ScrollReveal>
	{/if}

	<!-- DPG Compliance -->
	{#if dpgEvaluation}
		<ScrollReveal>
			<div class="border-t border-border pt-10 mb-12">
				<div class="flex items-baseline justify-between mb-6">
					<h3 class="heading-section">DPG Compliance</h3>
					<span class="text-data text-2xl text-text">{dpgEvaluation.passing_count}<span class="text-sm text-text-muted">/9</span></span>
				</div>

				<div class="flex items-center gap-3 mb-6">
					<span class="inline-flex items-center gap-1.5 text-sm font-medium {dpgEvaluation.approval_likelihood === 'high' ? 'text-positive' : dpgEvaluation.approval_likelihood === 'medium' ? 'text-text' : 'text-negative'}">
						{dpgEvaluation.approval_likelihood === 'high' ? 'High' : dpgEvaluation.approval_likelihood === 'medium' ? 'Medium' : 'Low'} approval likelihood
					</span>
					<span class="text-xs text-text-muted">(7/9 required)</span>
				</div>

				<!-- Criteria grid -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each dpgEvaluation.checklist as item}
						<div class="border border-border p-4">
							<div class="flex items-start gap-2.5 mb-2">
								<span class="shrink-0 mt-0.5 text-sm {item.status === 'pass' ? 'text-positive' : 'text-negative'}">
									{item.status === 'pass' ? '●' : '○'}
								</span>
								<span class="text-sm font-medium text-text leading-snug">{item.criterion}</span>
							</div>
							<p class="text-xs text-text-muted leading-relaxed ml-5">
								{item.status === 'pass' ? item.evidence : item.recommendation}
							</p>
						</div>
					{/each}
				</div>

				<!-- Priority actions -->
				{#if dpgEvaluation.priority_actions?.length}
					<div class="mt-6 pt-6 border-t border-border">
						<h4 class="heading-section mb-4">Priority Actions</h4>
						<ul class="space-y-2.5">
							{#each dpgEvaluation.priority_actions as action}
								<li class="flex items-start gap-3 text-sm">
									<span class="shrink-0 mt-0.5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-medium border {action.priority === 'critical' ? 'text-negative border-negative' : action.priority === 'high' ? 'text-text border-border-strong' : 'text-text-muted border-border'}">
										{action.priority}
									</span>
									<span class="text-text-secondary leading-relaxed">{action.action}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</ScrollReveal>
	{/if}

	<!-- 1+2. Demo + Repository (side by side) -->
	{#if project.demo_url || project.repo_url || repoInfo || repoLoading}
		<ScrollReveal>
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-10 sm:mb-12">
				{#if project.demo_url}
					{@const embedUrl = getEmbedUrl(project.demo_url)}
					<div>
						<h3 class="heading-section mb-4">Demo</h3>
						{#if embedUrl}
							<div class="aspect-video border border-border overflow-hidden">
								<iframe src={embedUrl} title="Demo" class="w-full h-full" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
							</div>
						{:else}
							<a href={project.demo_url} target="_blank" rel="noopener" class="block aspect-video border border-border bg-surface-alt hover:bg-surface-hover transition-colors flex items-center justify-center group">
								<span class="font-serif text-2xl italic text-text group-hover:text-text-secondary transition-colors">Open Demo &rarr;</span>
							</a>
						{/if}
					</div>
				{/if}

				{#if repoLoading && project.repo_url}
					<div>
						<h3 class="heading-section mb-4 flex items-center gap-2 text-text-muted">
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
							Repository
						</h3>
						<div class="border border-border p-6 space-y-3 animate-pulse">
							<div class="grid grid-cols-2 gap-3">
								<div class="h-6 bg-surface-alt"></div>
								<div class="h-6 bg-surface-alt"></div>
								<div class="h-6 bg-surface-alt"></div>
								<div class="h-6 bg-surface-alt"></div>
							</div>
							<div class="h-4 bg-surface-alt"></div>
						</div>
					</div>
				{:else if repoInfo}
					<div>
						<a
							href={project.repo_url}
							target="_blank"
							rel="noopener"
							class="heading-section mb-4 flex items-center gap-2 text-text hover:text-text-secondary transition-colors"
						>
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
							Repository
							<span class="text-text-muted ml-1">&rarr;</span>
						</a>
						<a href={project.repo_url} target="_blank" rel="noopener" class="block border border-border p-4 space-y-3 hover:bg-surface-alt hover:border-border-strong transition-colors">
							<div class="grid grid-cols-2 gap-3">
								<div>
									<span class="text-data text-lg text-text">{repoInfo.stargazers_count}</span>
									<span class="heading-section ml-2">Stars</span>
								</div>
								<div>
									<span class="text-data text-lg text-text">{repoInfo.forks_count}</span>
									<span class="heading-section ml-2">Forks</span>
								</div>
								<div>
									<span class="text-data text-lg text-text">{repoInfo.open_issues_count}</span>
									<span class="heading-section ml-2">Issues</span>
								</div>
								<div>
									<span class="text-data text-lg {repoInfo.has_readme ? 'text-positive' : 'text-negative'}">{repoInfo.has_readme ? 'Yes' : 'No'}</span>
									<span class="heading-section ml-2">README</span>
								</div>
							</div>
							{#if Object.keys(repoInfo.languages).length > 0}
								<div class="flex flex-wrap gap-1.5 pt-2 border-t border-border">
									{#each Object.entries(repoInfo.languages) as [lang]}
										<span class="tag">{lang}</span>
									{/each}
								</div>
							{/if}
							{#if contributors && contributors.length > 0}
								<div class="flex items-center gap-2 pt-2 border-t border-border">
									<span class="heading-section">Contributors ({contributors.length})</span>
									<div class="flex -space-x-1.5 ml-2">
										{#each contributors.slice(0, 8) as contrib}
											<img src={contrib.avatar_url} alt={contrib.login} title="{contrib.login} ({contrib.contributions} commits)" class="h-5 w-5 rounded-full object-cover border border-bg" />
										{/each}
									</div>
								</div>
							{/if}
							<p class="text-xs text-text-muted pt-2 border-t border-border">Updated {new Date(repoInfo.updated_at).toLocaleDateString()}</p>
						</a>
					</div>
				{:else if project.repo_url}
					<div>
						<a
							href={project.repo_url}
							target="_blank"
							rel="noopener"
							class="heading-section mb-4 flex items-center gap-2 text-text hover:text-text-secondary transition-colors"
						>
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
							Repository
							<span class="text-text-muted ml-1">&rarr;</span>
						</a>
						<a href={project.repo_url} target="_blank" rel="noopener" class="block border border-border p-6 hover:bg-surface-alt hover:border-border-strong transition-colors">
							<p class="font-serif italic text-lg text-text">View on GitHub</p>
							<p class="text-sm text-text-muted mt-2">Connect GitHub to see stars, forks, and contributors</p>
						</a>
					</div>
				{/if}
			</div>
		</ScrollReveal>
	{/if}

	<!-- 3. Milestones (Always visible) -->
	<ScrollReveal>
		<div class="border-t border-border pt-10 mb-12">
			<div class="flex items-baseline justify-between mb-6">
				<h3 class="heading-section">
					Milestones
					{#if nextSteps.length > 0}
						<span class="text-text-muted normal-case text-xs tracking-normal ml-3 font-normal">({fulfilledSteps.length}/{nextSteps.length} completed)</span>
					{/if}
				</h3>
				{#if isOwner && githubConnected && project.repo_url && project.analysis_status !== 'analyzing'}
					<form method="POST" action="?/retryAnalysis" use:enhance={() => {
						retryingAnalysis = true;
						return async ({ update }) => { retryingAnalysis = false; await update(); };
					}}>
						<button type="submit" disabled={retryingAnalysis} class="text-sm text-text-secondary link-draw">
							{retryingAnalysis ? 'Analyzing…' : 'Run Analysis'}
						</button>
					</form>
				{/if}
			</div>

			{#if project.analysis_status === 'analyzing'}
				<!-- Analysis in progress -->
				<div class="flex items-center gap-4 py-8">
					<span class="h-5 w-5 border-2 border-text-muted border-t-text rounded-full animate-spin shrink-0"></span>
					<div>
						<p class="text-base text-text">Analyzing your project...</p>
						<p class="text-sm text-text-muted mt-1">AI is reviewing your repository and generating milestones. This may take a moment.</p>
						{#if isOwner}
							<form method="POST" action="?/retryAnalysis" use:enhance={() => {
								retryingAnalysis = true;
								return async ({ update }) => { retryingAnalysis = false; await update(); };
							}} class="mt-3">
								<button type="submit" disabled={retryingAnalysis} class="text-sm text-text-secondary link-draw">
									{retryingAnalysis ? 'Retrying...' : 'Taking too long? Retry Analysis'}
								</button>
							</form>
						{/if}
					</div>
				</div>
			{:else if project.analysis_status === 'failed' && nextSteps.length === 0}
				<!-- Analysis failed -->
				<div class="py-8">
					<p class="text-base text-text">Analysis could not complete</p>
					<p class="text-sm text-text-muted mt-1">
						{#if !githubConnected}
							Connect your GitHub account to enable project analysis.
						{:else}
							Make sure your repository is accessible and try again.
						{/if}
					</p>
					{#if isOwner && githubConnected}
						<form method="POST" action="?/retryAnalysis" use:enhance={() => {
							retryingAnalysis = true;
							return async ({ update }) => { retryingAnalysis = false; await update(); };
						}} class="mt-4">
							<button type="submit" disabled={retryingAnalysis} class="inline-flex items-center px-4 py-2 bg-text text-bg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
								{retryingAnalysis ? 'Analyzing...' : 'Retry Analysis'}
							</button>
						</form>
					{:else if isOwner && !githubConnected}
						<a href="/profile" class="inline-block mt-4 text-sm text-text-secondary link-draw">Connect GitHub &rarr;</a>
					{/if}
				</div>
			{:else if nextSteps.length === 0}
				<!-- No milestones yet -->
				<div class="py-8">
					{#if project.repo_url}
						<p class="text-base text-text-secondary">Milestones will appear after your project is analyzed.</p>
						<p class="text-sm text-text-muted mt-1">Submit your project to trigger an automatic analysis, or ask an admin to add milestones.</p>
					{:else}
						<p class="text-base text-text-secondary">Add a repository URL to enable AI-powered milestone tracking.</p>
					{/if}
				</div>
			{:else}
				<!-- Pending milestones -->
				{#each pendingSteps as step, i}
					<div class="flex items-start gap-4 py-5 {i > 0 ? 'border-t border-border' : ''}">
						<span class="mt-1.5 h-4 w-4 rounded-full border border-border-strong shrink-0"></span>
						<div class="flex-1 min-w-0">
							<p class="text-base text-text leading-snug">{step.title}</p>
							{#if step.description}
								<p class="text-sm text-text-secondary mt-1.5 leading-relaxed">{step.description}</p>
							{/if}
							{#if step.done_when}
								<p class="text-xs text-text-muted mt-1.5 flex items-center gap-1.5">
									<span class="text-text-muted">Done when:</span>
									<span class="italic">{step.done_when}</span>
								</p>
							{/if}
							<div class="flex items-center gap-2 mt-3">
								<span class="tag">{step.category}</span>
								{#if step.source === 'manual'}
									<span class="text-xs text-text-muted">Admin assigned</span>
								{/if}
							</div>
						</div>
						<span class="text-sm text-data text-text-secondary shrink-0 mt-1.5">~{step.estimated_xp} XP</span>
						{#if step.implementation_status === 'implemented' && step.pr_url}
							<a href={step.pr_url} target="_blank" rel="noopener" class="inline-flex items-center px-3 py-1.5 border border-border-strong text-sm text-text hover:bg-surface-alt transition-colors shrink-0 mt-0.5">View PR</a>
						{:else if step.implementation_status === 'in_progress' || implementing === step.id}
							<span class="inline-flex items-center gap-2 px-3 py-1.5 border border-border text-sm text-text-muted shrink-0 mt-0.5">
								<span class="h-1.5 w-1.5 rounded-full bg-text-muted animate-pulse"></span>
								Implementing
							</span>
						{:else if step.plan_status === 'planning' || planning === step.id}
							<span class="inline-flex items-center gap-2 px-3 py-1.5 border border-border text-sm text-text-muted shrink-0 mt-0.5">
								<span class="h-1.5 w-1.5 rounded-full bg-text-muted animate-pulse"></span>
								Planning
							</span>
						{:else if isOwner && project.repo_url && !step.implementation_plan}
							<form method="POST" action="?/planImplementation" use:enhance={() => {
								planning = step.id;
								return async ({ update }) => { planning = null; await update(); };
							}} class="shrink-0 mt-0.5">
								<input type="hidden" name="step_id" value={step.id} />
								<button type="submit" class="inline-flex items-center px-3 py-1.5 bg-text text-bg text-sm font-semibold hover:opacity-90 transition-opacity">Plan</button>
							</form>
						{/if}
					</div>

					<!-- Terminal-style plan viewer -->
					{#if step.implementation_plan && step.plan_status === 'ready'}
						{@const plan = step.implementation_plan}
						<div class="ml-8 mt-3 border border-border-strong overflow-hidden">
							<!-- Terminal header -->
							<div class="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border-b border-border-strong">
								<span class="h-2.5 w-2.5 rounded-full bg-negative/60"></span>
								<span class="h-2.5 w-2.5 rounded-full bg-[#f5c542]/60"></span>
								<span class="h-2.5 w-2.5 rounded-full bg-positive/60"></span>
								<span class="text-xs text-text-muted ml-2 font-mono">raydr plan — {step.title}</span>
							</div>
							<!-- Terminal body -->
							<div class="bg-[#0d0d0d] p-4 font-mono text-xs leading-relaxed space-y-3">
								<div>
									<span class="text-positive">$</span>
									<span class="text-text-muted ml-2">plan ready</span>
								</div>
								<div class="text-text/90">{plan.summary}</div>
								<div>
									<span class="text-text-muted">approach:</span>
									<div class="text-text/80 ml-2 mt-1">{plan.approach}</div>
								</div>
								<div>
									<span class="text-text-muted">files:</span>
									{#each plan.files_to_modify as file}
										<div class="ml-2 mt-1">
											<span class="{file.action === 'create' ? 'text-positive' : 'text-[#f5c542]'}">{file.action === 'create' ? '+' : '~'}</span>
											<span class="text-text/90 ml-1">{file.path}</span>
											<span class="text-text-muted ml-2">— {file.description}</span>
										</div>
									{/each}
								</div>
								{#if plan.risks?.length}
									<div>
										<span class="text-negative">risks:</span>
										{#each plan.risks as risk}
											<div class="ml-2 mt-1 text-text-muted">! {risk}</div>
										{/each}
									</div>
								{/if}
								<div class="text-text-muted">est. {plan.estimated_diff_size}</div>
							</div>
							<!-- Action bar -->
							<div class="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border-t border-border-strong">
								<form method="POST" action="?/approveImplementation" use:enhance={() => {
									implementing = step.id;
									return async ({ update }) => { implementing = null; await update(); };
								}}>
									<input type="hidden" name="step_id" value={step.id} />
									<button type="submit" class="inline-flex items-center px-4 py-1.5 bg-positive text-[#0d0d0d] text-xs font-semibold hover:opacity-90 transition-opacity">
										Approve & Implement
									</button>
								</form>
								<form method="POST" action="?/rejectPlan" use:enhance>
									<input type="hidden" name="step_id" value={step.id} />
									<button type="submit" class="inline-flex items-center px-4 py-1.5 border border-border-strong text-xs text-text-muted hover:text-text transition-colors">
										Reject
									</button>
								</form>
							</div>
						</div>
					{:else if step.plan_status === 'failed'}
						<div class="ml-8 mt-3 flex items-center gap-3">
							<span class="text-xs text-negative">Plan generation failed</span>
							<form method="POST" action="?/planImplementation" use:enhance={() => {
								planning = step.id;
								return async ({ update }) => { planning = null; await update(); };
							}}>
								<input type="hidden" name="step_id" value={step.id} />
								<button type="submit" class="text-xs text-text-secondary link-draw">Retry</button>
							</form>
						</div>
					{/if}
				{/each}

				<!-- Fulfilled milestones -->
				{#if fulfilledSteps.length > 0}
					{#if pendingSteps.length > 0}
						<div class="border-t border-border my-3"></div>
					{/if}
					{#each fulfilledSteps as step, i}
						<div class="flex items-start gap-4 py-5 opacity-70 {i > 0 ? 'border-t border-border' : ''}">
							<span class="mt-1 h-4 w-4 rounded-full bg-positive/20 text-positive flex items-center justify-center shrink-0 text-[11px]">&#10003;</span>
							<div class="flex-1 min-w-0">
								<p class="text-base text-text leading-snug">{step.title}</p>
								<div class="flex items-center gap-2 mt-2">
									<span class="tag">{step.category}</span>
								</div>
							</div>
							<span class="text-sm text-data text-positive shrink-0 mt-1">+{step.estimated_xp} XP</span>
						</div>
					{/each}
				{/if}
			{/if}

			<!-- Admin: Add Milestone -->
			{#if isAdmin}
				<div class="mt-6 pt-6 border-t border-border">
					{#if showAddMilestone}
						<form method="POST" action="?/addMilestone" use:enhance={() => {
							return async ({ update }) => { showAddMilestone = false; await update(); };
						}} class="space-y-4">
							<input name="title" type="text" placeholder="Milestone title" required class="w-full px-4 py-3 text-base bg-surface-alt border border-border text-text" />
							<input name="description" type="text" placeholder="Description (optional)" class="w-full px-4 py-3 text-sm bg-surface-alt border border-border text-text" />
							<div class="flex gap-3">
								<select name="category" class="px-4 py-3 text-sm bg-surface-alt border border-border text-text">
									<option value="feature">Feature</option>
									<option value="bugfix">Bugfix</option>
									<option value="docs">Docs</option>
									<option value="refactor">Refactor</option>
									<option value="test">Test</option>
									<option value="infra">Infra</option>
									<option value="other">Other</option>
								</select>
								<input name="estimated_xp" type="number" value="50" min="10" max="200" class="w-24 px-4 py-3 text-sm bg-surface-alt border border-border text-text" />
								<span class="text-sm text-text-muted self-center">XP</span>
							</div>
							<div class="flex gap-4">
								<button type="submit" class="text-sm text-text link-draw">Add</button>
								<button type="button" onclick={() => showAddMilestone = false} class="text-sm text-text-muted link-draw">Cancel</button>
							</div>
						</form>
					{:else}
						<button onclick={() => showAddMilestone = true} class="text-sm text-text-secondary link-draw">+ Add milestone</button>
					{/if}
				</div>
			{/if}
		</div>
	</ScrollReveal>

	<!-- 4. Project Details -->
	<ScrollReveal>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-0 mb-10 sm:mb-12 border border-border">
			<div class="p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
				{#if project.problem_statement}
					<div>
						<h3 class="heading-section mb-3">Problem</h3>
						<p class="text-body">{project.problem_statement}</p>
					</div>
				{/if}
				{#if project.solution_summary}
					<div>
						<h3 class="heading-section mb-3">Solution</h3>
						<p class="text-body">{project.solution_summary}</p>
					</div>
				{/if}
				{#if project.project_goals}
					<div>
						<h3 class="heading-section mb-3">Goals</h3>
						<p class="text-body">{project.project_goals}</p>
					</div>
				{/if}
				{#if project.replaces_tool}
					<div>
						<h3 class="heading-section mb-3">Replaces</h3>
						<p class="text-base text-text">{project.replaces_tool}</p>
					</div>
				{/if}
				{#if !project.problem_statement && !project.solution_summary && !project.project_goals && !project.replaces_tool}
					<div>
						<p class="text-sm text-text-muted">No additional details yet.</p>
						{#if isOwner}
							<p class="text-xs text-text-muted mt-2">Use the edit buttons on the right to add project details.</p>
						{/if}
					</div>
				{/if}
			</div>
			<div class="p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8 bg-surface-alt border-t md:border-t-0 md:border-l border-border">
				<div>
					<div class="flex items-baseline justify-between mb-3">
						<h3 class="heading-section">Tech Stack</h3>
						{#if isOwner}
							<button onclick={() => startEdit('tech_stack', project.tech_stack)} class="text-xs text-text-muted link-draw">Edit</button>
						{/if}
					</div>
					{#if editingField === 'tech_stack'}
						<form method="POST" action="?/updateProject" use:enhance={() => {
							savingField = true;
							return async ({ update }) => { savingField = false; editingField = null; await update(); };
						}}>
							<input type="hidden" name="field" value="tech_stack" />
							<input name="value" type="text" bind:value={editValue} placeholder="SvelteKit, Python, PostgreSQL" class="w-full bg-transparent border-0 border-b border-border focus:border-text outline-none text-sm text-text py-1 mb-3" />
							<div class="flex gap-3">
								<button type="submit" disabled={savingField} class="text-xs text-text link-draw">{savingField ? 'Saving…' : 'Save'}</button>
								<button type="button" onclick={cancelEdit} class="text-xs text-text-muted link-draw">Cancel</button>
							</div>
						</form>
					{:else}
						<div class="flex flex-wrap gap-2">
							{#each project.tech_stack ?? [] as tech}
								<span class="tag">{tech}</span>
							{/each}
							{#if (project.tech_stack ?? []).length === 0}
								<span class="text-sm text-text-muted">None specified</span>
							{/if}
						</div>
					{/if}
				</div>
				<div>
					<div class="flex items-baseline justify-between mb-3">
						<h3 class="heading-section">AI Tools</h3>
						{#if isOwner}
							<button onclick={() => startEdit('ai_tools_used', project.ai_tools_used)} class="text-xs text-text-muted link-draw">Edit</button>
						{/if}
					</div>
					{#if editingField === 'ai_tools_used'}
						<form method="POST" action="?/updateProject" use:enhance={() => {
							savingField = true;
							return async ({ update }) => { savingField = false; editingField = null; await update(); };
						}}>
							<input type="hidden" name="field" value="ai_tools_used" />
							<input name="value" type="text" bind:value={editValue} placeholder="Claude, Cursor, Copilot" class="w-full bg-transparent border-0 border-b border-border focus:border-text outline-none text-sm text-text py-1 mb-3" />
							<div class="flex gap-3">
								<button type="submit" disabled={savingField} class="text-xs text-text link-draw">{savingField ? 'Saving…' : 'Save'}</button>
								<button type="button" onclick={cancelEdit} class="text-xs text-text-muted link-draw">Cancel</button>
							</div>
						</form>
					{:else}
						<div class="flex flex-wrap gap-2">
							{#each project.ai_tools_used ?? [] as tool}
								<span class="tag">{tool}</span>
							{/each}
							{#if (project.ai_tools_used ?? []).length === 0}
								<span class="text-sm text-text-muted">None specified</span>
							{/if}
						</div>
					{/if}
				</div>
				<div>
					<h3 class="heading-section mb-3">Period</h3>
					<p class="text-data text-base text-text">Season {project.season ?? '—'} &middot; Demo {project.demo_cycle ?? project.week ?? '—'}</p>
				</div>
			</div>
		</div>
	</ScrollReveal>

	<!-- Media -->
	{#if project.screenshot_urls?.length > 0}
		<ScrollReveal>
			<div class="border-t border-border pt-10 mb-12">
				<h3 class="heading-section mb-6">Media</h3>
				<div class="scroll-strip">
					{#each project.screenshot_urls as url}
						{@const isSvg = url.toLowerCase().endsWith('.svg')}
						<button onclick={() => lightboxUrl = url} class="flex-shrink-0 w-[70vw] md:w-[45vw] overflow-hidden border border-border hover:border-border-strong transition-colors {isSvg ? 'bg-white/5' : ''}">
							<img src={url} alt="Screenshot" class="w-full h-56 md:h-64 {isSvg ? 'object-contain p-4' : 'object-cover'}" />
						</button>
					{/each}
				</div>
			</div>
		</ScrollReveal>
	{/if}


	<!-- Adoption (only when teams have adopted) -->
	{#if adoptions.length > 0}
		<ScrollReveal>
			<div class="flex items-center gap-4 py-8 border-t border-border mb-12">
				<div class="flex -space-x-2">
					{#each adoptions.slice(0, 8) as adoption}
						{@const adopter = (adoption.adopter as any)}
						{#if adopter?.avatar_url}
							<img src={adopter.avatar_url} alt={adopter.full_name} class="h-8 w-8 rounded-full object-cover border-2 border-bg" />
						{:else}
							<div class="h-8 w-8 rounded-full bg-surface-alt flex items-center justify-center text-xs font-medium text-text border-2 border-bg">
								{adopter?.full_name?.charAt(0) ?? '?'}
							</div>
						{/if}
					{/each}
				</div>
				<span class="text-base text-text-secondary">
					{adoptions.length} team{adoptions.length === 1 ? '' : 's'} using this
				</span>
			</div>
		</ScrollReveal>
	{/if}

	<!-- Team -->
	{#if teamMembers.length > 0}
		<ScrollReveal>
			<div class="border-t border-border pt-10 mb-12">
				<h3 class="heading-section mb-6">Team</h3>
				<div class="flex flex-wrap gap-6">
					{#each teamMembers as member}
						<a href="/profiles/{member.id}" class="flex items-center gap-3 group">
							{#if member.avatar_url}
								<img src={member.avatar_url} alt={member.full_name} class="h-9 w-9 rounded-full object-cover" />
							{:else}
								<div class="h-9 w-9 rounded-full bg-surface-alt flex items-center justify-center text-sm font-medium text-text">
									{member.full_name?.charAt(0) ?? '?'}
								</div>
							{/if}
							<div>
								<p class="text-sm text-text group-hover:text-text-secondary transition-colors">{member.full_name}</p>
								<p class="text-xs text-text-muted mt-0.5">{member.department || '—'}</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</ScrollReveal>
	{/if}

	<!-- Comments -->
	<ScrollReveal>
		<div class="border-t border-border pt-10">
			<h3 class="heading-section mb-8">Comments ({comments.length})</h3>

			{#if userId}
				<form
					method="POST"
					action="?/comment"
					use:enhance={() => {
						submittingComment = true;
						return async ({ update }) => {
							submittingComment = false;
							commentText = '';
							await update();
						};
					}}
					class="mb-10"
				>
					<textarea
						name="content"
						bind:value={commentText}
						placeholder="Leave a comment..."
						rows="3"
						class="input-box w-full text-base"
						required
					></textarea>
					<div class="mt-3 flex justify-end">
						<button type="submit" disabled={submittingComment || !commentText.trim()} class="btn-primary">
							{submittingComment ? 'Posting...' : 'Post'}
						</button>
					</div>
				</form>
			{/if}

			{#if comments.length > 0}
				{#each comments as comment, i}
					{@const commenter = (comment.commenter as any)}
					<div class="py-6 {i > 0 ? 'border-t border-border' : ''}">
						<div class="flex items-start gap-4">
							<a href="/profiles/{comment.user_id}" class="flex-shrink-0">
								<div class="h-8 w-8 rounded-full bg-surface-alt flex items-center justify-center text-sm font-serif text-text">
									{commenter?.full_name?.charAt(0) ?? '?'}
								</div>
							</a>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-3">
									<a href="/profiles/{comment.user_id}" class="text-sm font-medium text-text link-draw">{commenter?.full_name ?? 'Unknown'}</a>
									<span class="text-xs text-text-muted">{timeAgo(comment.created_at)}</span>
									{#if comment.user_id === userId}
										<form method="POST" action="?/deleteComment" use:enhance class="ml-auto">
											<input type="hidden" name="id" value={comment.id} />
											<button type="submit" class="text-xs text-text-muted hover:text-negative transition-colors">Delete</button>
										</form>
									{/if}
								</div>
								<p class="mt-2 text-base text-text-secondary leading-relaxed">{comment.content}</p>
							</div>
						</div>
					</div>
				{/each}
			{:else}
				<p class="text-base text-text-muted text-center py-10">No comments yet. Be the first.</p>
			{/if}
		</div>
	</ScrollReveal>
</div>

<!-- Lightbox -->
{#if lightboxUrl}
	<button
		onclick={() => lightboxUrl = null}
		class="fixed inset-0 z-50 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
	>
		<img src={lightboxUrl} alt="Screenshot" class="max-w-full max-h-full object-contain" />
	</button>
{/if}
