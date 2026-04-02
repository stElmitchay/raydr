<script lang="ts">
	import { enhance } from '$app/forms';
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

	let { data } = $props();
	const project = $derived(data.project);
	const teamMembers = $derived(data.teamMembers);
	const comments = $derived(data.comments);
	const adoptions = $derived(data.adoptions);
	const milestones = $derived(data.milestones);
	const nextSteps = $derived(data.nextSteps);
	const dpgEvaluation = $derived(data.dpgEvaluation);
	const repoInfo = $derived(data.repoInfo);
	const contributors = $derived(data.contributors);
	const userId = $derived(data.userId);
	const isOwner = $derived(userId === project.submitted_by);
	const isAdmin = $derived(data.isAdmin);

	let implementing = $state<string | null>(null);
	let showAddMilestone = $state(false);
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

<div class="px-6 md:px-10 lg:px-16 py-10 max-w-5xl mx-auto">
	<!-- Back -->
	<a href="/projects" class="text-sm text-text-muted link-draw inline-block mb-8 animate-fade-up stagger-1">&larr; Projects</a>

	<!-- Title -->
	<div class="flex items-start justify-between gap-4 mb-8 animate-fade-up stagger-1">
		<h1 class="heading-display text-[clamp(2rem,4vw,3rem)] text-text">{project.title}</h1>
		<div class="flex items-center gap-2 flex-shrink-0 pt-2">
			{#if dpgEvaluation}
				<span class="tag">{dpgEvaluation.overall_score}/100</span>
			{/if}
			{#if project.status === 'featured'}
				<span class="tag-featured">Featured</span>
			{/if}
		</div>
	</div>

	<p class="text-body max-w-2xl mb-10 animate-fade-up stagger-2">{project.description}</p>

	<!-- Metrics Row -->
	<ScrollReveal>
		<div class="flex items-center gap-0 border-t border-b border-border py-6 mb-10">
			<div class="flex-1 text-center">
				<p class="text-data text-2xl text-positive">${((project.annual_cost_replaced ?? 0) / 1000).toFixed(0)}K</p>
				<p class="heading-section mt-1">Saved / year</p>
			</div>
			<div class="w-px h-8 bg-border"></div>
			<div class="flex-1 text-center">
				<p class="text-data text-2xl text-text">{project.estimated_hours_saved_weekly ?? 0}h</p>
				<p class="heading-section mt-1">Saved / week</p>
			</div>
			<div class="w-px h-8 bg-border"></div>
			<div class="flex-1 text-center">
				<p class="text-data text-2xl text-text">{project.adoption_count ?? 0}</p>
				<p class="heading-section mt-1">Adoptions</p>
			</div>
		</div>
	</ScrollReveal>

	<!-- Screenshots -->
	{#if project.screenshot_urls?.length > 0}
		<ScrollReveal>
			<div class="mb-10">
				<h3 class="heading-section mb-4">Screenshots</h3>
				<div class="scroll-strip">
					{#each project.screenshot_urls as url}
						<button onclick={() => lightboxUrl = url} class="flex-shrink-0 w-[60vw] md:w-[40vw] overflow-hidden border border-border hover:border-border-strong transition-colors">
							<img src={url} alt="Screenshot" class="w-full h-48 md:h-56 object-cover" />
						</button>
					{/each}
				</div>
			</div>
		</ScrollReveal>
	{/if}

	<!-- Video -->
	{#if project.video_url}
		{@const embedUrl = getEmbedUrl(project.video_url)}
		<ScrollReveal>
			<div class="mb-10">
				<h3 class="heading-section mb-4">Demo Video</h3>
				{#if embedUrl}
					<div class="aspect-video border border-border overflow-hidden">
						<iframe src={embedUrl} title="Demo video" class="w-full h-full" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
					</div>
				{:else}
					<a href={project.video_url} target="_blank" rel="noopener" class="text-sm text-text link-draw">Watch Video &rarr;</a>
				{/if}
			</div>
		</ScrollReveal>
	{/if}

	<!-- Adoption -->
	<ScrollReveal>
		<div class="flex items-center justify-between py-6 border-t border-border mb-10">
			<div class="flex items-center gap-3">
				{#if adoptions.length > 0}
					<div class="flex -space-x-1.5">
						{#each adoptions.slice(0, 8) as adoption}
							{#if adoption.adopter?.avatar_url}
								<img src={adoption.adopter.avatar_url} alt={adoption.adopter.full_name} class="h-6 w-6 rounded-full object-cover border border-bg" />
							{:else}
								<div class="h-6 w-6 rounded-full bg-surface-alt flex items-center justify-center text-[10px] font-medium text-text border border-bg">
									{adoption.adopter?.full_name?.charAt(0) ?? '?'}
								</div>
							{/if}
						{/each}
					</div>
				{/if}
				<span class="text-sm text-text-secondary">
					{adoptions.length === 0 ? 'No teams using this yet' : `${adoptions.length} team${adoptions.length === 1 ? '' : 's'} using this`}
				</span>
			</div>
			{#if userId}
				{#if hasAdopted}
					<span class="text-sm text-text-muted">Adopted</span>
				{:else}
					<form method="POST" action="?/adopt" use:enhance>
						<button type="submit" class="btn-primary px-4 py-1.5 text-sm">We use this</button>
					</form>
				{/if}
			{/if}
		</div>
	</ScrollReveal>

	<!-- Split Plane: Problem/Solution + Tech Details -->
	<ScrollReveal>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-0 mb-10 border border-border">
			<div class="p-6 md:p-8 space-y-6">
				<div>
					<h3 class="heading-section mb-2">Problem</h3>
					<p class="text-body">{project.problem_statement}</p>
				</div>
				<div>
					<h3 class="heading-section mb-2">Solution</h3>
					<p class="text-body">{project.solution_summary}</p>
				</div>
			</div>
			<div class="p-6 md:p-8 space-y-6 bg-surface-alt border-t md:border-t-0 md:border-l border-border">
				{#if project.replaces_tool}
					<div>
						<h3 class="heading-section mb-2">Replaces</h3>
						<p class="text-sm text-text">{project.replaces_tool}</p>
					</div>
				{/if}
				<div>
					<h3 class="heading-section mb-2">Tech Stack</h3>
					<div class="flex flex-wrap gap-1.5">
						{#each project.tech_stack ?? [] as tech}
							<span class="tag">{tech}</span>
						{/each}
						{#if (project.tech_stack ?? []).length === 0}
							<span class="text-xs text-text-muted">None specified</span>
						{/if}
					</div>
				</div>
				<div>
					<h3 class="heading-section mb-2">AI Tools</h3>
					<div class="flex flex-wrap gap-1.5">
						{#each project.ai_tools_used ?? [] as tool}
							<span class="tag">{tool}</span>
						{/each}
						{#if (project.ai_tools_used ?? []).length === 0}
							<span class="text-xs text-text-muted">None specified</span>
						{/if}
					</div>
				</div>
				<div>
					<h3 class="heading-section mb-2">Period</h3>
					<p class="text-data text-sm text-text">Season {project.season ?? '—'} &middot; Demo {project.demo_cycle ?? project.week ?? '—'}</p>
				</div>
			</div>
		</div>
	</ScrollReveal>

	<!-- Action Links -->
	{#if project.demo_url || project.repo_url}
		<ScrollReveal>
			<div class="flex flex-wrap gap-4 mb-10">
				{#if project.demo_url}
					<a href={project.demo_url} target="_blank" rel="noopener" class="btn-primary px-5 py-2 text-sm">View Demo</a>
				{/if}
				{#if project.repo_url}
					<a href={project.repo_url} target="_blank" rel="noopener" class="btn-secondary px-5 py-2 text-sm">Source Code</a>
				{/if}
				{#if isOwner && project.repo_url}
					<a href="/projects/{project.id}/analyze" class="text-sm text-text-secondary link-draw py-2">Analyze Progress</a>
					<a href="/projects/{project.id}/generate-readme" class="text-sm text-text-secondary link-draw py-2">Generate README</a>
				{/if}
			</div>
		</ScrollReveal>
	{/if}

	<!-- GitHub Repo Stats -->
	{#if repoInfo}
		<ScrollReveal>
			<div class="border-t border-border pt-8 mb-10">
				<h3 class="heading-section mb-4 flex items-center gap-2">
					<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
					Repository
				</h3>
				<div class="flex gap-8 mb-4">
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
					<div class="flex flex-wrap gap-1.5 mb-4">
						{#each Object.entries(repoInfo.languages) as [lang]}
							<span class="tag">{lang}</span>
						{/each}
					</div>
				{/if}
				{#if contributors && contributors.length > 0}
					<div class="flex items-center gap-2 mb-2">
						<span class="heading-section">Contributors ({contributors.length})</span>
						<div class="flex -space-x-1.5 ml-2">
							{#each contributors.slice(0, 10) as contrib}
								<img src={contrib.avatar_url} alt={contrib.login} title="{contrib.login} ({contrib.contributions} commits)" class="h-6 w-6 rounded-full object-cover border border-bg" />
							{/each}
						</div>
					</div>
				{/if}
				<p class="text-xs text-text-muted">Updated {new Date(repoInfo.updated_at).toLocaleDateString()}</p>
			</div>
		</ScrollReveal>
	{/if}

	<!-- Milestones -->
	{#if milestones.length > 0}
		<ScrollReveal>
			<div class="border-t border-border pt-8 mb-10">
				<h3 class="heading-section mb-4">Milestones ({milestones.length})</h3>
				{#each milestones as milestone, i}
					<div class="flex items-start gap-3 py-3 {i > 0 ? 'border-t border-border' : ''}">
						<span class="tag text-[10px] shrink-0 mt-0.5">{milestone.category}</span>
						<div class="flex-1 min-w-0">
							<p class="text-sm text-text">{milestone.title}</p>
							{#if milestone.description}
								<p class="text-xs text-text-muted mt-0.5">{milestone.description}</p>
							{/if}
						</div>
						{#if milestone.xp_value > 0}
							<span class="text-xs text-data text-text-secondary shrink-0">+{milestone.xp_value} XP</span>
						{/if}
					</div>
				{/each}
			</div>
		</ScrollReveal>
	{/if}

	<!-- Next Steps / Milestones -->
	{#if nextSteps.length > 0 || isAdmin}
		<ScrollReveal>
			<div class="border-t border-border pt-8 mb-10">
				<h3 class="heading-section mb-4">Up Next</h3>
				{#each nextSteps as step, i}
					<div class="flex items-start gap-3 py-3 {i > 0 ? 'border-t border-border' : ''}">
						<span class="tag text-[10px] shrink-0 mt-0.5">{step.category}</span>
						<div class="flex-1 min-w-0">
							<p class="text-sm text-text {step.completed ? 'line-through opacity-60' : ''}">{step.title}</p>
							{#if step.description}
								<p class="text-xs text-text-muted mt-0.5">{step.description}</p>
							{/if}
							{#if step.source === 'manual'}
								<span class="text-[10px] text-text-muted">Admin assigned</span>
							{/if}
						</div>
						<span class="text-xs text-data text-text-muted shrink-0">~{step.estimated_xp} XP</span>
						{#if step.completed}
							<span class="text-xs text-positive shrink-0">Fulfilled</span>
						{:else if step.implementation_status === 'implemented' && step.pr_url}
							<a href={step.pr_url} target="_blank" rel="noopener" class="text-xs text-text link-draw shrink-0">View PR</a>
						{:else if step.implementation_status === 'in_progress' || implementing === step.id}
							<span class="text-xs text-text-muted shrink-0">Implementing...</span>
						{:else if step.implementation_status === 'failed'}
							<form method="POST" action="?/implement" use:enhance={() => {
								implementing = step.id;
								return async ({ update }) => { implementing = null; await update(); };
							}}>
								<input type="hidden" name="step_id" value={step.id} />
								<button type="submit" class="text-xs text-negative link-draw shrink-0">Retry</button>
							</form>
						{:else if isOwner && project.repo_url}
							<form method="POST" action="?/implement" use:enhance={() => {
								implementing = step.id;
								return async ({ update }) => { implementing = null; await update(); };
							}}>
								<input type="hidden" name="step_id" value={step.id} />
								<button type="submit" class="text-xs text-text link-draw shrink-0">Implement</button>
							</form>
						{/if}
					</div>
				{/each}

				<!-- Admin: Add Milestone -->
				{#if isAdmin}
					<div class="mt-4 pt-4 border-t border-border">
						{#if showAddMilestone}
							<form method="POST" action="?/addMilestone" use:enhance={() => {
								return async ({ update }) => { showAddMilestone = false; await update(); };
							}} class="space-y-3">
								<input name="title" type="text" placeholder="Milestone title" required class="w-full px-3 py-2 text-sm bg-surface-alt border border-border text-text" />
								<input name="description" type="text" placeholder="Description (optional)" class="w-full px-3 py-2 text-sm bg-surface-alt border border-border text-text" />
								<div class="flex gap-3">
									<select name="category" class="px-3 py-2 text-sm bg-surface-alt border border-border text-text">
										<option value="feature">Feature</option>
										<option value="bugfix">Bugfix</option>
										<option value="docs">Docs</option>
										<option value="refactor">Refactor</option>
										<option value="test">Test</option>
										<option value="infra">Infra</option>
										<option value="other">Other</option>
									</select>
									<input name="estimated_xp" type="number" value="50" min="10" max="200" class="w-20 px-3 py-2 text-sm bg-surface-alt border border-border text-text" />
									<span class="text-xs text-text-muted self-center">XP</span>
								</div>
								<div class="flex gap-2">
									<button type="submit" class="text-sm text-text link-draw">Add</button>
									<button type="button" onclick={() => showAddMilestone = false} class="text-sm text-text-muted link-draw">Cancel</button>
								</div>
							</form>
						{:else}
							<button onclick={() => showAddMilestone = true} class="text-sm text-text-muted link-draw">+ Add milestone</button>
						{/if}
					</div>
				{/if}
			</div>
		</ScrollReveal>
	{/if}

	<!-- Team -->
	{#if teamMembers.length > 0}
		<ScrollReveal>
			<div class="border-t border-border pt-8 mb-10">
				<h3 class="heading-section mb-4">Team</h3>
				<div class="flex flex-wrap gap-4">
					{#each teamMembers as member}
						<a href="/profiles/{member.id}" class="flex items-center gap-2.5 group">
							{#if member.avatar_url}
								<img src={member.avatar_url} alt={member.full_name} class="h-7 w-7 rounded-full object-cover" />
							{:else}
								<div class="h-7 w-7 rounded-full bg-surface-alt flex items-center justify-center text-xs font-medium text-text">
									{member.full_name?.charAt(0) ?? '?'}
								</div>
							{/if}
							<div>
								<p class="text-sm text-text group-hover:text-text-secondary transition-colors">{member.full_name}</p>
								<p class="text-xs text-text-muted">{member.department || '—'}</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</ScrollReveal>
	{/if}

	<!-- Comments -->
	<ScrollReveal>
		<div class="border-t border-border pt-8">
			<h3 class="heading-section mb-6">Comments ({comments.length})</h3>

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
					class="mb-8"
				>
					<textarea
						name="content"
						bind:value={commentText}
						placeholder="Leave a comment..."
						rows="2"
						class="input-box w-full text-sm"
						required
					></textarea>
					<div class="mt-2 flex justify-end">
						<button type="submit" disabled={submittingComment || !commentText.trim()} class="btn-primary px-4 py-1.5 text-sm">
							{submittingComment ? 'Posting...' : 'Post'}
						</button>
					</div>
				</form>
			{/if}

			{#if comments.length > 0}
				{#each comments as comment, i}
					<div class="py-4 {i > 0 ? 'border-t border-border' : ''}">
						<div class="flex items-start gap-3">
							<a href="/profiles/{comment.user_id}" class="flex-shrink-0">
								<div class="h-6 w-6 rounded-full bg-surface-alt flex items-center justify-center text-[10px] font-serif text-text">
									{comment.commenter?.full_name?.charAt(0) ?? '?'}
								</div>
							</a>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<a href="/profiles/{comment.user_id}" class="text-sm font-medium text-text link-draw">{comment.commenter?.full_name ?? 'Unknown'}</a>
									<span class="text-xs text-text-muted">{timeAgo(comment.created_at)}</span>
									{#if comment.user_id === userId}
										<form method="POST" action="?/deleteComment" use:enhance class="ml-auto">
											<input type="hidden" name="id" value={comment.id} />
											<button type="submit" class="text-xs text-text-muted hover:text-negative transition-colors">Delete</button>
										</form>
									{/if}
								</div>
								<p class="mt-1 text-sm text-text-secondary leading-relaxed">{comment.content}</p>
							</div>
						</div>
					</div>
				{/each}
			{:else}
				<p class="text-sm text-text-muted text-center py-6">No comments yet.</p>
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
