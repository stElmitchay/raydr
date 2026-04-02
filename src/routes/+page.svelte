<script lang="ts">
	import HeroCounter from '$lib/components/ui/HeroCounter.svelte';
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';
	import ProjectRow from '$lib/components/ui/ProjectRow.svelte';

	let { data } = $props();
	let showAnalytics = $state(false);

	// Analytics computations
	const weeklyData = $derived.by(() => {
		const weeks: Record<number, { week: number; submissions: number; costSaved: number }> = {};
		for (const p of data.allProjects ?? []) {
			const w = p.demo_cycle ?? p.week ?? 0;
			if (!weeks[w]) weeks[w] = { week: w, submissions: 0, costSaved: 0 };
			weeks[w].submissions++;
			weeks[w].costSaved += p.annual_cost_replaced ?? 0;
		}
		return Object.values(weeks).sort((a, b) => a.week - b.week);
	});

	const cumulativeData = $derived.by(() => {
		let cumulative = 0;
		return weeklyData.map(w => {
			cumulative += w.costSaved;
			return { week: w.week, total: cumulative };
		});
	});

	const maxCumulative = $derived(Math.max(1, ...cumulativeData.map(d => d.total)));
	const maxSubmissions = $derived(Math.max(1, ...weeklyData.map(d => d.submissions)));

	const aiToolCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const p of data.allProjects ?? []) {
			for (const tool of p.ai_tools_used ?? []) {
				counts[tool] = (counts[tool] || 0) + 1;
			}
		}
		return Object.entries(counts).sort((a, b) => b[1] - a[1]);
	});
	const maxToolCount = $derived(Math.max(1, ...aiToolCounts.map(([, c]) => c)));

	const sortedDepts = $derived((data.departmentStats ?? []).slice().sort((a: any, b: any) => (b.total_cost_saved ?? 0) - (a.total_cost_saved ?? 0)));
	const maxDeptCost = $derived(Math.max(1, ...sortedDepts.map((d: any) => d.total_cost_saved ?? 0)));
</script>

<!-- Hero Section -->
<section class="min-h-[85vh] flex flex-col justify-end px-6 md:px-10 lg:px-16 pb-12 relative">
	<div class="flex flex-col md:flex-row md:items-end justify-between gap-8">
		<!-- Main Metric -->
		<div class="animate-fade-up stagger-1">
			<HeroCounter targetValue={data.totals?.total_cost_saved ?? 0} label="Total cost saved" />
		</div>

		<!-- Demo Countdown + Cycle Theme -->
		<div class="animate-fade-up stagger-2 text-right">
			{#if data.cycleTheme}
				<p class="font-serif text-lg italic text-text-secondary">{data.cycleTheme.name}</p>
				<p class="text-xs text-text-muted mt-0.5 mb-4 max-w-[250px] ml-auto">{data.cycleTheme.description}</p>
			{/if}
			<span class="text-data text-5xl md:text-6xl text-text">{data.daysUntilDemo}</span>
			<p class="heading-section mt-2">Days until demo</p>
			<p class="text-xs text-text-muted mt-1">
				{new Date(data.nextDemoDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
			</p>
		</div>
	</div>

	<!-- Secondary Metrics -->
	<div class="animate-fade-up stagger-3 mt-8 pt-6 border-t border-border flex flex-wrap gap-8 md:gap-16">
		<div>
			<span class="text-data text-2xl">{data.totals?.total_projects ?? 0}</span>
			<p class="heading-section mt-1">Projects</p>
		</div>
		<div>
			<span class="text-data text-2xl">{data.totals?.total_hours_saved ?? 0}</span>
			<p class="heading-section mt-1">Hours saved / week</p>
		</div>
		<div>
			<span class="text-data text-2xl">{data.totals?.total_adoptions ?? 0}</span>
			<p class="heading-section mt-1">Adoptions</p>
		</div>
		<div>
			<span class="text-data text-2xl">{data.totals?.active_builders ?? 0}</span>
			<p class="heading-section mt-1">Builders</p>
		</div>
	</div>
</section>

<!-- Featured Projects — Horizontal Scroll -->
<ScrollReveal>
	<section class="px-6 md:px-10 lg:px-16 py-12">
		<div class="flex items-baseline justify-between mb-6">
			<h2 class="heading-page">Featured</h2>
			<a href="/projects" class="text-sm text-text-secondary link-draw">View all</a>
		</div>

		{#if data.featuredProjects.length > 0}
			<div class="scroll-strip">
				{#each data.featuredProjects as project}
					<a href="/projects/{project.id}" class="block w-[70vw] md:w-[45vw] lg:w-[35vw] group">
						{#if project.screenshot_urls?.[0]}
							<div class="w-full aspect-[16/9] bg-surface-alt overflow-hidden mb-4">
								<img
									src={project.screenshot_urls[0]}
									alt={project.title}
									class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
							</div>
						{:else}
							<div class="w-full aspect-[16/9] bg-surface-alt mb-4 flex items-center justify-center">
								<span class="text-text-muted text-sm">No preview</span>
							</div>
						{/if}
						<h3 class="font-serif text-xl text-text group-hover:text-text-secondary transition-colors">{project.title}</h3>
						<p class="text-sm text-text-muted mt-1 line-clamp-2">{project.description}</p>
						<div class="flex items-center gap-4 mt-3 text-data text-xs text-text-secondary">
							{#if project.annual_cost_replaced}
								<span>${(project.annual_cost_replaced / 1000).toFixed(0)}K/yr saved</span>
							{/if}
							{#if project.estimated_hours_saved_weekly}
								<span>{project.estimated_hours_saved_weekly}h/wk</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="py-16 text-center border-t border-border">
				<p class="text-text-muted text-sm">No featured projects yet.</p>
				<a href="/submit" class="mt-2 inline-block text-sm text-text link-draw">Submit the first one</a>
			</div>
		{/if}
	</section>
</ScrollReveal>

<!-- Department Rankings + Recent — editorial layout -->
<ScrollReveal>
	<section class="px-6 md:px-10 lg:px-16 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 border-t border-border">
		<!-- Department Rankings -->
		<div>
			<h2 class="heading-section mb-6">Departments</h2>
			{#if data.departmentStats.length > 0}
				<div class="space-y-0">
					{#each data.departmentStats.slice(0, 7) as dept, i}
						<div class="flex items-baseline py-3 {i > 0 ? 'border-t border-border' : ''}">
							<span class="text-data text-xs text-text-muted w-6">{String(i + 1).padStart(2, '0')}</span>
							<span class="font-serif text-lg text-text flex-shrink-0">{dept.department || 'Unset'}</span>
							<span class="leader-dots"></span>
							<span class="text-data text-sm text-text">${((dept.total_cost_saved ?? 0) / 1000).toFixed(0)}K</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-text-muted">No data yet</p>
			{/if}
		</div>

		<!-- Recent + Challenges -->
		<div class="space-y-10">
			{#if data.activeChallenges.length > 0}
				<div>
					<div class="flex items-baseline justify-between mb-6">
						<h2 class="heading-section">Active Challenges</h2>
						<a href="/challenges" class="text-xs text-text-muted link-draw">View all</a>
					</div>
					{#each data.activeChallenges as challenge}
						{@const daysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
						<a href="/challenges" class="block py-2 group">
							<p class="text-sm text-text group-hover:text-text-secondary transition-colors">{challenge.title}</p>
							<p class="text-xs text-text-muted">{daysLeft > 0 ? `${daysLeft}d remaining` : 'Ended'}</p>
						</a>
					{/each}
				</div>
			{/if}

			<div>
				<h2 class="heading-section mb-6">Recent</h2>
				{#if data.recentProjects.length > 0}
					{#each data.recentProjects as project, i}
						<a href="/projects/{project.id}" class="flex items-baseline py-2.5 group {i > 0 ? 'border-t border-border' : ''}">
							<span class="font-serif text-text group-hover:text-text-secondary transition-colors flex-1">{project.title}</span>
							<span class="text-xs text-text-muted ml-4">{project.submitter?.full_name ?? 'Unknown'}</span>
						</a>
					{/each}
				{:else}
					<p class="text-sm text-text-muted">No activity yet</p>
				{/if}
			</div>
		</div>
	</section>
</ScrollReveal>

<!-- Inline Analytics (Collapsible) -->
<ScrollReveal>
	<section class="px-6 md:px-10 lg:px-16 py-12 border-t border-border">
		<button
			onclick={() => showAnalytics = !showAnalytics}
			class="w-full flex items-center justify-between py-2 group"
		>
			<h2 class="heading-page">Analytics</h2>
			<span class="text-xs text-text-muted group-hover:text-text transition-colors">{showAnalytics ? 'Collapse' : 'Expand'}</span>
		</button>

		{#if showAnalytics}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-8">
				<div>
					<h3 class="heading-section mb-5">Cumulative Cost Saved</h3>
					{#if cumulativeData.length > 0}
						<div class="space-y-2.5">
							{#each cumulativeData as d}
								<div class="flex items-center gap-3">
									<span class="text-xs text-data text-text-muted w-8">D{d.week}</span>
									<div class="flex-1 h-5 bg-surface-alt overflow-hidden">
										<div class="h-full bg-text transition-all duration-500" style="width: {Math.max(4, (d.total / maxCumulative) * 100)}%"></div>
									</div>
									<span class="text-xs text-data text-text-secondary w-14 text-right">${(d.total / 1000).toFixed(0)}K</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-text-muted py-8 text-center">No data yet</p>
					{/if}
				</div>

				<div>
					<h3 class="heading-section mb-5">Submissions per Cycle</h3>
					{#if weeklyData.length > 0}
						<div class="flex items-end gap-2 h-36">
							{#each weeklyData as d}
								<div class="flex-1 flex flex-col items-center gap-1">
									<span class="text-xs text-data text-text">{d.submissions}</span>
									<div class="w-full flex justify-center">
										<div class="w-full max-w-[32px] bg-text transition-all duration-500" style="height: {Math.max(3, (d.submissions / maxSubmissions) * 110)}px"></div>
									</div>
									<span class="text-xs text-data text-text-muted">D{d.week}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-text-muted py-8 text-center">No data yet</p>
					{/if}
				</div>

				<div>
					<h3 class="heading-section mb-5">AI Tool Usage</h3>
					{#if aiToolCounts.length > 0}
						<div class="space-y-2.5">
							{#each aiToolCounts as [tool, count]}
								<div class="flex items-center gap-3">
									<span class="text-xs text-text w-28 truncate flex-shrink-0">{tool}</span>
									<div class="flex-1 h-4 bg-surface-alt overflow-hidden">
										<div class="h-full bg-text/60 transition-all duration-300" style="width: {Math.max(8, (count / maxToolCount) * 100)}%"></div>
									</div>
									<span class="text-xs text-data text-text-muted w-6 text-right">{count}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-text-muted py-8 text-center">No data yet</p>
					{/if}
				</div>

				<div>
					<h3 class="heading-section mb-5">Department Breakdown</h3>
					{#if sortedDepts.length > 0}
						<div class="space-y-3">
							{#each sortedDepts as dept}
								<div>
									<div class="flex justify-between mb-1">
										<span class="text-xs text-text">{dept.department}</span>
										<span class="text-xs text-data text-positive">${((dept.total_cost_saved ?? 0) / 1000).toFixed(0)}K</span>
									</div>
									<div class="h-3 bg-surface-alt overflow-hidden">
										<div class="h-full bg-text/40 transition-all duration-300" style="width: {Math.max(4, ((dept.total_cost_saved ?? 0) / maxDeptCost) * 100)}%"></div>
									</div>
									<div class="flex justify-between text-[11px] text-text-muted mt-0.5">
										<span class="text-data">{dept.total_projects} projects &middot; {dept.active_builders} builders</span>
										<span class="text-data">{dept.total_hours_saved}h/wk</span>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-text-muted py-8 text-center">No data yet</p>
					{/if}
				</div>
			</div>
		{/if}
	</section>
</ScrollReveal>
