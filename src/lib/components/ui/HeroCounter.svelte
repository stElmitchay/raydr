<script lang="ts">
	let { targetValue, label = '' }: {
		targetValue: number;
		label?: string;
	} = $props();

	let displayValue = $state(0);
	let containerEl = $state<HTMLDivElement | null>(null);
	let hasAnimated = $state(false);

	function runAnimation() {
		if (hasAnimated) return;
		hasAnimated = true;

		const duration = 2000;
		const steps = 60;
		const increment = targetValue / steps;
		let step = 0;

		const interval = setInterval(() => {
			step++;
			displayValue = Math.min(targetValue, Math.round(increment * step));
			if (step >= steps) clearInterval(interval);
		}, duration / steps);
	}

	$effect(() => {
		if (!containerEl) return;

		// Skip animation if reduced motion is requested.
		if (
			typeof window !== 'undefined' &&
			window.matchMedia &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			displayValue = targetValue;
			hasAnimated = true;
			return;
		}

		// Only animate when the counter scrolls into view.
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					runAnimation();
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(containerEl);
		return () => observer.disconnect();
	});

	function formatValue(val: number): string {
		if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
		if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
		return `$${val.toLocaleString()}`;
	}
</script>

<div class="flex flex-col" bind:this={containerEl}>
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
