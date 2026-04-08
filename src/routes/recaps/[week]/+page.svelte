<script lang="ts">
	import ProjectRow from '$lib/components/ui/ProjectRow.svelte';
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

	let { data } = $props();
	const season = $derived(data.season);
	const cycle = $derived(data.cycle);
	const projects = $derived(data.projects as any[]);
	const stats = $derived(data.stats);
	const topTools = $derived(data.topTools);
	const winner = $derived(data.winner as any);

	const maxToolCount = $derived(topTools.length > 0 ? topTools[0].count : 1);
</script>

<div class="px-5 sm:px-6 md:px-10 lg:px-16 py-10 sm:py-12">
	<a href="/recaps" class="text-sm text-text-muted link-draw inline-block mb-8 animate-fade-up stagger-1">&larr; Recaps</a>

	<h1 class="heading-page mb-2 animate-fade-up stagger-1">Demo {cycle}</h1>
	<p class="text-sm text-text-muted mb-8 animate-fade-up stagger-2">{season.name}</p>

	<!-- Stats -->
	<ScrollReveal>
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-t border-b border-border mb-8 sm:mb-10">
			<div class="bg-bg p-4 sm:p-6 text-center">
				<p class="text-data text-xl sm:text-2xl text-text">{stats.submissions}</p>
				<p class="heading-section mt-1">Submissions</p>
			</div>
			<div class="bg-bg p-4 sm:p-6 text-center">
				<p class="text-data text-xl sm:text-2xl text-positive">${(stats.totalCost / 1000).toFixed(0)}K</p>
				<p class="heading-section mt-1">Cost Saved</p>
			</div>
			<div class="bg-bg p-4 sm:p-6 text-center">
				<p class="text-data text-xl sm:text-2xl text-text">{stats.totalHours}h</p>
				<p class="heading-section mt-1">Hours Saved</p>
			</div>
			<div class="bg-bg p-4 sm:p-6 text-center">
				<p class="text-data text-xl sm:text-2xl text-text">{stats.departments}</p>
				<p class="heading-section mt-1">Departments</p>
			</div>
		</div>
	</ScrollReveal>

	<!-- Winner -->
	{#if winner}
		<ScrollReveal>
			<div class="border-l-2 border-text pl-6 mb-10">
				<p class="heading-section mb-2">Cycle Winner</p>
				<h2 class="font-serif text-xl text-text">{winner.title}</h2>
				<div class="mt-2 flex items-center gap-3">
					{#if winner.submitter?.avatar_url}
						<img src={winner.submitter.avatar_url} alt={winner.submitter.full_name} class="h-5 w-5 rounded-full object-cover" />
					{:else}
						<div class="h-5 w-5 rounded-full bg-surface-alt flex items-center justify-center text-[10px] font-medium text-text">
							{winner.submitter?.full_name?.charAt(0) ?? '?'}
						</div>
					{/if}
					<span class="text-sm text-text-secondary">{winner.submitter?.full_name ?? 'Unknown'}</span>
					<span class="text-data text-sm text-positive">${((winner.annual_cost_replaced ?? 0) / 1000).toFixed(0)}K saved/yr</span>
				</div>
				<p class="mt-3 text-body">{winner.description}</p>
			</div>
		</ScrollReveal>
	{/if}

	<!-- Top AI Tools -->
	{#if topTools.length > 0}
		<ScrollReveal>
			<div class="mb-10">
				<h3 class="heading-section mb-4">Top AI Tools</h3>
				<div class="space-y-2.5">
					{#each topTools as tool}
						<div class="flex items-center gap-3">
							<span class="text-sm text-text w-28 text-right truncate flex-shrink-0">{tool.name}</span>
							<div class="flex-1 h-5 bg-surface-alt overflow-hidden">
								<div
									class="h-full bg-text transition-all duration-300"
									style="width: {(tool.count / maxToolCount) * 100}%"
								></div>
							</div>
							<span class="text-xs text-data text-text-muted w-6">{tool.count}</span>
						</div>
					{/each}
				</div>
			</div>
		</ScrollReveal>
	{/if}

	<!-- All Submissions -->
	<ScrollReveal>
		<div class="border-t border-border pt-8">
			<div class="flex items-center justify-between mb-4">
				<h3 class="heading-section">All Submissions</h3>
				<a href="/recaps/{cycle}/newsletter" class="text-sm text-text-secondary link-draw">View Newsletter &rarr;</a>
			</div>
			{#each projects as project}
				<ProjectRow {project} />
			{/each}
		</div>
	</ScrollReveal>
</div>
