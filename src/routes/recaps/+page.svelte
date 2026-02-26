<script lang="ts">
	let { data } = $props();
	const season = $derived(data.season);
	const weeks = $derived(data.weeks);
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-display font-bold text-text tracking-tighter">Weekly Recaps</h1>
		{#if season}
			<p class="text-sm text-text-muted mt-1">{season.name} — week-by-week changelog</p>
		{:else}
			<p class="text-sm text-text-muted mt-1">No active season</p>
		{/if}
	</div>

	{#if weeks.length > 0}
		<div class="space-y-4">
			{#each weeks as week}
				<a href="/recaps/{week.week}" class="glass-card-hover p-6 block">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<div class="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
								<span class="text-lg font-bold font-mono text-primary-light">{week.week}</span>
							</div>
							<div>
								<h3 class="text-base font-display font-semibold text-text">Week {week.week}</h3>
								<p class="text-sm text-text-muted">{week.count} submission{week.count === 1 ? '' : 's'}</p>
							</div>
						</div>
						<div class="flex items-center gap-6 text-right">
							<div>
								<p class="text-sm font-bold font-mono text-success">${(week.costSaved / 1000).toFixed(0)}k</p>
								<p class="text-xs text-text-muted">saved</p>
							</div>
							{#if week.winner}
								<div class="max-w-[200px]">
									<p class="text-sm font-medium text-accent-light truncate">{week.winner.title}</p>
									<p class="text-xs text-text-muted">by {week.winner.submitterName}</p>
								</div>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="glass-card p-16 text-center">
			<p class="text-sm text-text-muted">No submissions yet this season</p>
		</div>
	{/if}
</div>
