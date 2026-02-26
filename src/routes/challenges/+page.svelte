<script lang="ts">
	let { data } = $props();
	const challenges = $derived(data.challenges);
	const deptMetrics = $derived(data.deptMetrics);

	function daysUntil(dateStr: string): number {
		return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
	}

	function getDeptProgress(dept: string, metric: string): number {
		const m = deptMetrics[dept];
		if (!m) return 0;
		if (metric === 'cost_saved') return m.cost_saved;
		if (metric === 'projects') return m.projects;
		if (metric === 'hours_saved') return m.hours_saved;
		return 0;
	}

	const departments = $derived(Object.keys(deptMetrics).sort());

	function metricLabel(metric: string): string {
		if (metric === 'cost_saved') return 'Cost Saved ($)';
		if (metric === 'projects') return 'Projects';
		if (metric === 'hours_saved') return 'Hours Saved/wk';
		return metric;
	}

	function formatProgress(value: number, metric: string): string {
		if (metric === 'cost_saved') return `$${(value / 1000).toFixed(0)}k`;
		return value.toString();
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-display font-bold text-text tracking-tighter">Challenges</h1>
		<p class="text-sm text-text-muted mt-1">Department vs department competitions</p>
	</div>

	{#if challenges.length > 0}
		<div class="space-y-6">
			{#each challenges as challenge}
				{@const remaining = daysUntil(challenge.end_date)}
				<div class="glass-card p-6 space-y-5">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h2 class="text-lg font-display font-bold text-text">{challenge.title}</h2>
							{#if challenge.description}
								<p class="text-sm text-text-secondary mt-1">{challenge.description}</p>
							{/if}
						</div>
						<div class="text-right flex-shrink-0">
							<span class="tag-{remaining > 7 ? 'primary' : remaining > 0 ? 'accent' : 'success'}">
								{remaining > 0 ? `${remaining}d left` : 'Ended'}
							</span>
							<p class="text-xs text-text-muted mt-1">Target: {formatProgress(challenge.target, challenge.metric)}</p>
						</div>
					</div>

					<div>
						<p class="text-xs text-text-muted uppercase tracking-wider mb-3">{metricLabel(challenge.metric)}</p>
						<div class="space-y-3">
							{#each departments as dept}
								{@const progress = getDeptProgress(dept, challenge.metric)}
								{@const pct = Math.min(100, (progress / Math.max(1, challenge.target)) * 100)}
								{@const completed = pct >= 100}
								<div>
									<div class="flex justify-between mb-1">
										<span class="text-sm text-text">{dept}</span>
										<span class="text-xs font-mono {completed ? 'text-success font-bold' : 'text-text-muted'}">
											{formatProgress(progress, challenge.metric)} / {formatProgress(challenge.target, challenge.metric)}
										</span>
									</div>
									<div class="h-4 rounded-md bg-white/[0.03] overflow-hidden">
										<div
											class="h-full rounded-md transition-all duration-500 {completed
												? 'bg-gradient-to-r from-success/40 via-success/70 to-success shadow-[0_0_10px_rgba(34,197,94,0.2)]'
												: 'bg-gradient-to-r from-primary/30 via-primary/60 to-primary-light'}"
											style="width: {Math.max(2, pct)}%"
										></div>
									</div>
								</div>
							{/each}
							{#if departments.length === 0}
								<p class="text-sm text-text-muted text-center py-4">No department data yet</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="glass-card p-16 text-center">
			<p class="text-sm text-text-muted">No active challenges right now</p>
		</div>
	{/if}
</div>
