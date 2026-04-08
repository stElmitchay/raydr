<script lang="ts">
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

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
		if (metric === 'cost_saved') return `$${(value / 1000).toFixed(0)}K`;
		return value.toString();
	}
</script>

<div class="px-5 sm:px-6 md:px-10 lg:px-16 py-10 sm:py-12">
	<h1 class="heading-page mb-2 animate-fade-up stagger-1">Challenges</h1>
	<p class="text-sm text-text-muted mb-10 animate-fade-up stagger-2">Department competitions</p>

	{#if challenges.length > 0}
		<div class="space-y-10">
			{#each challenges as challenge, ci}
				{@const remaining = daysUntil(challenge.end_date)}
				<ScrollReveal delay={ci * 80}>
					<div class="{ci > 0 ? 'border-t border-border pt-10' : ''}">
						<div class="flex items-start justify-between gap-4 mb-6">
							<div>
								<h2 class="font-serif text-xl text-text">{challenge.title}</h2>
								{#if challenge.description}
									<p class="text-body mt-1">{challenge.description}</p>
								{/if}
							</div>
							<div class="text-right flex-shrink-0">
								<span class="tag">{remaining > 0 ? `${remaining}d left` : 'Ended'}</span>
								<p class="text-xs text-text-muted mt-1">Target: {formatProgress(challenge.target, challenge.metric)}</p>
							</div>
						</div>

						<p class="heading-section mb-4">{metricLabel(challenge.metric)}</p>
						<div class="space-y-3">
							{#each departments as dept}
								{@const progress = getDeptProgress(dept, challenge.metric)}
								{@const pct = Math.min(100, (progress / Math.max(1, challenge.target)) * 100)}
								{@const completed = pct >= 100}
								<div>
									<div class="flex justify-between gap-3 mb-1">
										<span class="text-sm text-text truncate min-w-0">{dept}</span>
										<span class="text-xs text-data shrink-0 {completed ? 'text-positive font-semibold' : 'text-text-muted'}">
											{formatProgress(progress, challenge.metric)} / {formatProgress(challenge.target, challenge.metric)}
										</span>
									</div>
									<div class="h-3 bg-surface-alt overflow-hidden">
										<div
											class="h-full transition-all duration-500 {completed ? 'bg-positive' : 'bg-text/50'}"
											style="width: {Math.max(1, pct)}%"
										></div>
									</div>
								</div>
							{/each}
							{#if departments.length === 0}
								<p class="text-sm text-text-muted text-center py-6">No department data yet</p>
							{/if}
						</div>
					</div>
				</ScrollReveal>
			{/each}
		</div>
	{:else}
		<div class="py-20 text-center">
			<p class="text-sm text-text-muted">No active challenges right now</p>
		</div>
	{/if}
</div>
