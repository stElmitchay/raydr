<script lang="ts">
	let { data } = $props();
	const season = $derived(data.season);
	const cycles = $derived(data.cycles ?? []);
</script>

<div class="px-5 sm:px-6 md:px-10 lg:px-16 py-10 sm:py-12">
	<h1 class="heading-page mb-2 animate-fade-up stagger-1">Demo Recaps</h1>
	{#if season}
		<p class="text-sm text-text-muted mb-10 animate-fade-up stagger-2">{season.name}</p>
	{:else}
		<p class="text-sm text-text-muted mb-10 animate-fade-up stagger-2">No active season</p>
	{/if}

	{#if cycles.length > 0}
		<div class="animate-fade-up stagger-3">
			{#each cycles as cycle, i}
				<a href="/recaps/{cycle.cycle}" class="flex items-center justify-between py-5 group {i > 0 ? 'border-t border-border' : ''} hover:bg-surface-alt transition-colors -mx-4 px-4">
					<div class="flex items-baseline gap-4">
						<span class="font-serif text-2xl text-text">{cycle.cycle}</span>
						<div>
							<span class="text-sm text-text group-hover:text-text-secondary transition-colors">Demo {cycle.cycle}</span>
							<span class="text-xs text-text-muted ml-2">{cycle.count} submission{cycle.count === 1 ? '' : 's'}</span>
						</div>
					</div>
					<div class="flex items-center gap-8 text-right">
						<div>
							<span class="text-data text-sm text-positive">${(cycle.costSaved / 1000).toFixed(0)}K</span>
							<span class="heading-section ml-2">saved</span>
						</div>
						{#if cycle.winner}
							<div class="max-w-[200px] hidden md:block">
								<p class="text-sm text-text truncate">{cycle.winner.title}</p>
								<p class="text-xs text-text-muted">{cycle.winner.submitterName}</p>
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="py-20 text-center">
			<p class="text-sm text-text-muted">No submissions yet this season</p>
		</div>
	{/if}
</div>
