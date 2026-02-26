<script lang="ts">
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';

	let { data } = $props();
	const season = $derived(data.season);
	const week = $derived(data.week);
	const projects = $derived(data.projects);
	const stats = $derived(data.stats);
	const topTools = $derived(data.topTools);
	const winner = $derived(data.winner);

	const maxToolCount = $derived(topTools.length > 0 ? topTools[0].count : 1);
</script>

<div class="space-y-8">
	<a href="/recaps" class="inline-flex items-center gap-1.5 glass-card px-3 py-1.5 text-sm text-text-muted hover:text-text hover:bg-white/[0.06] transition-all duration-200">&larr; Recaps</a>

	<div>
		<h1 class="text-3xl font-display font-bold text-text tracking-tighter">Week {week}</h1>
		<p class="text-sm text-text-muted mt-1">{season.name}</p>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-4 gap-5">
		<div class="glass-card p-5 text-center">
			<p class="text-xl font-bold font-mono text-text">{stats.submissions}</p>
			<p class="text-xs text-text-muted">Submissions</p>
		</div>
		<div class="glass-card p-5 text-center">
			<p class="text-xl font-bold font-mono text-success">${(stats.totalCost / 1000).toFixed(0)}k</p>
			<p class="text-xs text-text-muted">Cost Saved</p>
		</div>
		<div class="glass-card p-5 text-center">
			<p class="text-xl font-bold font-mono text-primary-light">{stats.totalHours}h</p>
			<p class="text-xs text-text-muted">Hours Saved</p>
		</div>
		<div class="glass-card p-5 text-center">
			<p class="text-xl font-bold font-mono text-text">{stats.departments}</p>
			<p class="text-xs text-text-muted">Departments</p>
		</div>
	</div>

	<!-- Winner Spotlight -->
	{#if winner}
		<div class="glass-card p-8 ring-1 ring-accent/30 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
			<div class="flex items-center gap-2 mb-4">
				<span class="tag-accent">Week Winner</span>
			</div>
			<h2 class="text-xl font-display font-bold text-text">{winner.title}</h2>
			<div class="mt-2 flex items-center gap-3">
				{#if winner.submitter?.avatar_url}
					<img src={winner.submitter.avatar_url} alt={winner.submitter.full_name} class="h-6 w-6 rounded-full object-cover" />
				{:else}
					<div class="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary-light">
						{winner.submitter?.full_name?.charAt(0) ?? '?'}
					</div>
				{/if}
				<span class="text-sm text-text-secondary">{winner.submitter?.full_name ?? 'Unknown'}</span>
				<span class="text-sm font-bold font-mono text-success">${((winner.annual_cost_replaced ?? 0) / 1000).toFixed(0)}k saved/yr</span>
			</div>
			<p class="mt-3 text-sm text-text-secondary leading-relaxed">{winner.description}</p>
		</div>
	{/if}

	<!-- Top AI Tools -->
	{#if topTools.length > 0}
		<div class="glass-card p-6">
			<h3 class="text-sm font-display font-semibold text-text mb-4">Top AI Tools This Week</h3>
			<div class="space-y-3">
				{#each topTools as tool}
					<div class="flex items-center gap-3">
						<span class="text-sm text-text-secondary w-24 text-right truncate">{tool.name}</span>
						<div class="flex-1 h-6 rounded-md overflow-hidden bg-white/[0.03]">
							<div
								class="h-full rounded-md bg-gradient-to-r from-primary to-primary-light flex items-center px-2"
								style="width: {(tool.count / maxToolCount) * 100}%"
							>
								<span class="text-xs font-mono font-bold text-white">{tool.count}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- All Submissions -->
	<div>
		<h3 class="text-sm font-display font-semibold text-text mb-4">All Submissions</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
			{#each projects as project}
				<ProjectCard {project} />
			{/each}
		</div>
	</div>
</div>
