<script lang="ts">
	let { targetValue, label = '' }: {
		targetValue: number;
		label?: string;
	} = $props();

	let displayValue = $state(0);

	$effect(() => {
		const duration = 2000;
		const steps = 60;
		const increment = targetValue / steps;
		let current = 0;
		let step = 0;

		const interval = setInterval(() => {
			step++;
			current = Math.min(targetValue, Math.round(increment * step));
			displayValue = current;
			if (step >= steps) clearInterval(interval);
		}, duration / steps);

		return () => clearInterval(interval);
	});

	function formatValue(val: number): string {
		if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
		if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
		return `$${val.toLocaleString()}`;
	}
</script>

<div class="flex flex-col">
	<span
		class="heading-display text-[clamp(3.5rem,10vw,7rem)] text-text"
		style="animation: metric-pulse 4s ease-in-out infinite"
	>
		{formatValue(displayValue)}
	</span>
	{#if label}
		<span class="heading-section mt-3">{label}</span>
	{/if}
</div>
