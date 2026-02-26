<script lang="ts">
	import { enhance } from '$app/forms';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';

	let { data } = $props();
	const project = $derived(data.project);
	const teamMembers = $derived(data.teamMembers);
	const comments = $derived(data.comments);
	const adoptions = $derived(data.adoptions);
	const userId = $derived(data.userId);

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
		// YouTube
		let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
		if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
		// Loom
		match = url.match(/loom\.com\/share\/([\w-]+)/);
		if (match) return `https://www.loom.com/embed/${match[1]}`;
		return null;
	}
</script>

<div class="max-w-3xl mx-auto space-y-8">
	<a href="/projects" class="inline-flex items-center gap-1.5 glass-card px-3 py-1.5 text-sm text-text-muted hover:text-text hover:bg-white/[0.06] transition-all duration-200">&larr; Projects</a>

	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-3xl font-display font-bold text-text tracking-tighter">{project.title}</h1>
			<p class="mt-2 text-sm text-text-secondary leading-relaxed">{project.description}</p>
		</div>
		{#if project.status === 'featured'}
			<span class="tag-accent flex-shrink-0">Featured</span>
		{/if}
	</div>

	<div class="grid grid-cols-3 gap-5">
		<div class="glass-card p-6 text-center">
			<p class="text-2xl font-bold font-mono text-success">${((project.annual_cost_replaced ?? 0) / 1000).toFixed(0)}k</p>
			<p class="text-xs text-text-muted mt-1">Saved / year</p>
		</div>
		<div class="glass-card p-6 text-center">
			<p class="text-2xl font-bold font-mono text-primary-light">{project.estimated_hours_saved_weekly ?? 0}h</p>
			<p class="text-xs text-text-muted mt-1">Saved / week</p>
		</div>
		<div class="glass-card p-6 text-center">
			<p class="text-2xl font-bold font-mono text-text">{project.adoption_count ?? 0}</p>
			<p class="text-xs text-text-muted mt-1">Adoptions</p>
		</div>
	</div>

	<!-- Screenshots -->
	{#if project.screenshot_urls?.length > 0}
		<div>
			<h3 class="text-sm font-display font-semibold text-text mb-4">Screenshots</h3>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
				{#each project.screenshot_urls as url}
					<button onclick={() => lightboxUrl = url} class="overflow-hidden rounded-lg ring-1 ring-white/10 hover:ring-primary/30 transition-all duration-200">
						<img src={url} alt="Screenshot" class="w-full h-32 object-cover" />
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Video -->
	{#if project.video_url}
		{@const embedUrl = getEmbedUrl(project.video_url)}
		<div>
			<h3 class="text-sm font-display font-semibold text-text mb-4">Demo Video</h3>
			{#if embedUrl}
				<div class="aspect-video rounded-lg overflow-hidden ring-1 ring-white/10">
					<iframe src={embedUrl} title="Demo video" class="w-full h-full" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
				</div>
			{:else}
				<a href={project.video_url} target="_blank" rel="noopener" class="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2">
					Watch Video
				</a>
			{/if}
		</div>
	{/if}

	<!-- Adoption -->
	<div class="glass-card p-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				{#if adoptions.length > 0}
					<div class="flex -space-x-2">
						{#each adoptions.slice(0, 8) as adoption}
							{#if adoption.adopter?.avatar_url}
								<img src={adoption.adopter.avatar_url} alt={adoption.adopter.full_name} class="h-7 w-7 rounded-full object-cover ring-2 ring-surface" />
							{:else}
								<div class="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary-light ring-2 ring-surface">
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
					<span class="btn-secondary px-4 py-2 text-sm opacity-60 cursor-default">Adopted</span>
				{:else}
					<form method="POST" action="?/adopt" use:enhance>
						<button type="submit" class="btn-primary px-4 py-2 text-sm">We use this</button>
					</form>
				{/if}
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
		<div class="glass-card p-6 space-y-5">
			<div>
				<h3 class="text-xs font-display font-medium text-text-muted uppercase tracking-wider">Problem</h3>
				<p class="mt-1.5 text-sm text-text leading-relaxed">{project.problem_statement}</p>
			</div>
			<div>
				<h3 class="text-xs font-display font-medium text-text-muted uppercase tracking-wider">Solution</h3>
				<p class="mt-1.5 text-sm text-text leading-relaxed">{project.solution_summary}</p>
			</div>
		</div>

		<div class="glass-card p-6 space-y-5">
			{#if project.replaces_tool}
				<div>
					<h3 class="text-xs font-display font-medium text-text-muted uppercase tracking-wider">Replaces</h3>
					<p class="mt-1.5 text-sm text-text">{project.replaces_tool}</p>
				</div>
			{/if}
			<div>
				<h3 class="text-xs font-display font-medium text-text-muted uppercase tracking-wider">Tech Stack</h3>
				<div class="mt-1.5 flex flex-wrap gap-1.5">
					{#each project.tech_stack ?? [] as tech}
						<span class="tag-neutral">{tech}</span>
					{/each}
					{#if (project.tech_stack ?? []).length === 0}
						<span class="text-xs text-text-muted">None specified</span>
					{/if}
				</div>
			</div>
			<div>
				<h3 class="text-xs font-display font-medium text-text-muted uppercase tracking-wider">AI Tools</h3>
				<div class="mt-1.5 flex flex-wrap gap-1.5">
					{#each project.ai_tools_used ?? [] as tool}
						<span class="tag-primary">{tool}</span>
					{/each}
					{#if (project.ai_tools_used ?? []).length === 0}
						<span class="text-xs text-text-muted">None specified</span>
					{/if}
				</div>
			</div>
			<div>
				<h3 class="text-xs font-display font-medium text-text-muted uppercase tracking-wider">Period</h3>
				<p class="mt-1.5 text-sm text-text font-mono">Season {project.season ?? '—'} · Week {project.week ?? '—'}</p>
			</div>
		</div>
	</div>

	{#if project.demo_url || project.repo_url}
		<div class="flex gap-3">
			{#if project.demo_url}
				<a href={project.demo_url} target="_blank" rel="noopener" class="btn-primary px-5 py-2.5 text-sm">
					View Demo
				</a>
			{/if}
			{#if project.repo_url}
				<a href={project.repo_url} target="_blank" rel="noopener" class="btn-secondary px-5 py-2.5 text-sm">
					Source Code
				</a>
			{/if}
		</div>
	{/if}

	{#if teamMembers.length > 0}
		<div class="glass-card p-6">
			<h3 class="text-sm font-display font-semibold text-text mb-4">Team</h3>
			<div class="flex flex-wrap gap-3">
				{#each teamMembers as member}
					<a href="/profiles/{member.id}" class="flex items-center gap-2.5 glass-card px-4 py-3 hover:bg-white/[0.06] transition-all duration-200">
						{#if member.avatar_url}
							<img src={member.avatar_url} alt={member.full_name} class="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
						{:else}
							<div class="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary-light ring-1 ring-white/10">
								{member.full_name?.charAt(0) ?? '?'}
							</div>
						{/if}
						<div>
							<p class="text-sm font-medium text-text">{member.full_name}</p>
							<p class="text-xs text-text-muted">{member.department || 'No department'}</p>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Comments -->
	<div class="glass-card p-6">
		<h3 class="text-sm font-display font-semibold text-text mb-4">Comments ({comments.length})</h3>

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
				class="mb-6"
			>
				<textarea
					name="content"
					bind:value={commentText}
					placeholder="Leave a comment..."
					rows="2"
					class="glass-input w-full px-4 py-2.5 text-sm text-text"
					required
				></textarea>
				<div class="mt-2 flex justify-end">
					<button
						type="submit"
						disabled={submittingComment || !commentText.trim()}
						class="btn-primary px-4 py-2 text-sm"
					>
						{submittingComment ? 'Posting...' : 'Post Comment'}
					</button>
				</div>
			</form>
		{/if}

		{#if comments.length > 0}
			<div class="space-y-3">
				{#each comments as comment}
					<div class="glass-card p-4">
						<div class="flex items-start gap-3">
							<a href="/profiles/{comment.user_id}">
								{#if comment.commenter?.avatar_url}
									<img src={comment.commenter.avatar_url} alt={comment.commenter.full_name} class="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
								{:else}
									<div class="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary-light ring-1 ring-white/10">
										{comment.commenter?.full_name?.charAt(0) ?? '?'}
									</div>
								{/if}
							</a>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<a href="/profiles/{comment.user_id}" class="text-sm font-medium text-text hover:text-primary-light transition-colors">{comment.commenter?.full_name ?? 'Unknown'}</a>
									<span class="text-xs text-text-muted">{timeAgo(comment.created_at)}</span>
									{#if comment.user_id === userId}
										<form method="POST" action="?/deleteComment" use:enhance class="ml-auto">
											<input type="hidden" name="id" value={comment.id} />
											<button type="submit" class="text-xs text-text-muted hover:text-danger transition-colors">Delete</button>
										</form>
									{/if}
								</div>
								<p class="mt-1 text-sm text-text-secondary leading-relaxed">{comment.content}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-text-muted text-center py-4">No comments yet. Be the first!</p>
		{/if}
	</div>
</div>

<!-- Lightbox -->
{#if lightboxUrl}
	<button
		onclick={() => lightboxUrl = null}
		class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
	>
		<img src={lightboxUrl} alt="Screenshot" class="max-w-full max-h-full object-contain rounded-lg" />
	</button>
{/if}
