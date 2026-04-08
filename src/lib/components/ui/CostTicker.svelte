<script lang="ts">
	let { targetValue, label = 'Total Saved by Raydr' }: { targetValue: number; label?: string } = $props();

	let displayValue = $state(0);

	$effect(() => {
		const target = targetValue ?? 0;
		const duration = 2000;
		const steps = 60;
		const increment = target / steps;
		let step = 0;

		const interval = setInterval(() => {
			step++;
			displayValue = Math.round(Math.min(target, increment * step));
			if (step >= steps) clearInterval(interval);
		}, duration / steps);

		return () => clearInterval(interval);
	});

	function fmt(v: number): string {
		if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
		if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
		return `$${v}`;
	}
</script>

<div class="relative overflow-hidden glass-card p-10">
	<div class="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent"></div>
	<div class="absolute inset-0 bg-gradient-to-tl from-accent/[0.02] to-transparent"></div>
	<div class="relative">
		<p class="text-sm font-display font-medium text-text-muted uppercase tracking-widest">{label}</p>
		<p class="mt-3 text-6xl font-bold font-mono text-text tabular-nums tracking-tight" style="filter: drop-shadow(0 0 20px rgba(245, 245, 245, 0.1));">
			{fmt(displayValue)}
		</p>
		<p class="mt-2 text-sm text-text-secondary">per year in tool replacements</p>
	</div>
</div>
