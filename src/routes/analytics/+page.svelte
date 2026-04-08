<script lang="ts">
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

	let { data } = $props();

	const weeklyData = $derived.by(() => {
		const weeks: Record<number, { week: number; submissions: number; costSaved: number; hoursSaved: number }> = {};
		for (const p of data.projects) {
			const w = p.week ?? 0;
			if (!weeks[w]) weeks[w] = { week: w, submissions: 0, costSaved: 0, hoursSaved: 0 };
			weeks[w].submissions++;
			weeks[w].costSaved += p.annual_cost_replaced ?? 0;
			weeks[w].hoursSaved += p.estimated_hours_saved_weekly ?? 0;
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
		for (const p of data.projects) {
			for (const tool of p.ai_tools_used ?? []) {
				counts[tool] = (counts[tool] || 0) + 1;
			}
		}
		return Object.entries(counts).sort((a, b) => b[1] - a[1]);
	});
	const maxToolCount = $derived(Math.max(1, ...aiToolCounts.map(([, c]) => c)));

	const sortedDepts = $derived(data.departmentStats.slice().sort((a: any, b: any) => (b.total_cost_saved ?? 0) - (a.total_cost_saved ?? 0)));
	const maxDeptCost = $derived(Math.max(1, ...sortedDepts.map((d: any) => d.total_cost_saved ?? 0)));

	const heatmapData = $derived.by(() => {
		const matrix: Record<string, Record<string, number>> = {};
		const allTools = new Set<string>();
		const allDepts = new Set<string>();

		for (const p of data.projectsWithDept ?? []) {
			const dept = (p.submitter as any)?.department || 'Unknown';
			allDepts.add(dept);
			for (const tool of p.ai_tools_used ?? []) {
				allTools.add(tool);
				if (!matrix[dept]) matrix[dept] = {};
				matrix[dept][tool] = (matrix[dept][tool] || 0) + 1;
			}
		}

		const departments = Array.from(allDepts).sort();
		const tools = Array.from(allTools).sort();
		let maxCount = 0;
		for (const dept of departments) {
			for (const tool of tools) {
				maxCount = Math.max(maxCount, matrix[dept]?.[tool] ?? 0);
			}
		}

		return { departments, tools, matrix, maxCount: Math.max(1, maxCount) };
	});
</script>

<div class="px-6 md:px-10 lg:px-16 py-10">
	<h1 class="heading-page mb-2 animate-fade-up stagger-1">Analytics</h1>
	<p class="text-sm text-text-muted mb-10 animate-fade-up stagger-2">Program performance and insights</p>

	<!-- KPIs -->
	<ScrollReveal>
		<div class="flex items-center gap-0 border-t border-b border-border py-6 mb-10">
			<div class="flex-1 text-center">
				<p class="text-data text-2xl text-positive">${((data.totals.total_cost_saved ?? 0) / 1000).toFixed(0)}K</p>
				<p class="heading-section mt-1">Total Cost Saved</p>
			</div>
			<div class="w-px h-8 bg-border"></div>
			<div class="flex-1 text-center">
				<p class="text-data text-2xl text-text">{data.totals.total_hours_saved ?? 0}</p>
				<p class="heading-section mt-1">Hours Saved/Week</p>
			</div>
			<div class="w-px h-8 bg-border"></div>
			<div class="flex-1 text-center">
				<p class="text-data text-2xl text-text">{data.profileCount ?? 0}</p>
				<p class="heading-section mt-1">Active Builders</p>
			</div>
			<div class="w-px h-8 bg-border"></div>
			<div class="flex-1 text-center">
				<p class="text-data text-2xl text-text">{data.totals.total_projects ?? 0}</p>
				<p class="heading-section mt-1">Total Projects</p>
			</div>
		</div>
	</ScrollReveal>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
		<!-- Cumulative Cost -->
		<ScrollReveal>
			<div>
				<h3 class="heading-section mb-5">Cumulative Cost Saved</h3>
				{#if cumulativeData.length > 0}
					<div class="space-y-2.5">
						{#each cumulativeData as d}
							<div class="flex items-center gap-3">
								<span class="text-xs text-data text-text-muted w-10">Wk {d.week}</span>
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
		</ScrollReveal>

		<!-- Weekly Submissions -->
		<ScrollReveal delay={80}>
			<div>
				<h3 class="heading-section mb-5">Weekly Submissions</h3>
				{#if weeklyData.length > 0}
					<div class="flex items-end gap-2 h-36">
						{#each weeklyData as d}
							<div class="flex-1 flex flex-col items-center gap-1">
								<span class="text-xs text-data text-text">{d.submissions}</span>
								<div class="w-full flex justify-center">
									<div class="w-full max-w-[32px] bg-text transition-all duration-500" style="height: {Math.max(3, (d.submissions / maxSubmissions) * 110)}px"></div>
								</div>
								<span class="text-xs text-data text-text-muted">W{d.week}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-text-muted py-8 text-center">No data yet</p>
				{/if}
			</div>
		</ScrollReveal>

		<!-- AI Tool Usage -->
		<ScrollReveal delay={160}>
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
		</ScrollReveal>

		<!-- Department Breakdown -->
		<ScrollReveal delay={240}>
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
		</ScrollReveal>
	</div>

	<!-- Heatmap -->
	{#if heatmapData.tools.length > 0 && heatmapData.departments.length > 0}
		<ScrollReveal delay={320}>
			<div class="mt-10 border-t border-border pt-8">
				<h3 class="heading-section mb-5">AI Tool Adoption by Department</h3>
				<div class="overflow-x-auto">
					<div class="inline-grid gap-px bg-border" style="grid-template-columns: 120px repeat({heatmapData.tools.length}, minmax(50px, 1fr));">
						<div class="bg-bg"></div>
						{#each heatmapData.tools as tool}
							<div class="bg-bg text-[10px] text-text-muted text-center truncate px-1 py-2" title={tool}>{tool}</div>
						{/each}

						{#each heatmapData.departments as dept}
							<div class="bg-bg text-xs text-text-secondary truncate flex items-center pr-2 py-2" title={dept}>{dept}</div>
							{#each heatmapData.tools as tool}
								{@const count = heatmapData.matrix[dept]?.[tool] ?? 0}
								{@const intensity = count / heatmapData.maxCount}
								<div
									class="bg-bg h-10 flex items-center justify-center"
									style="background-color: rgba(232, 226, 217, {intensity > 0 ? Math.max(0.04, intensity * 0.15) : 0})"
									title="{dept}: {tool} ({count})"
								>
									{#if count > 0}
										<span class="text-xs text-data text-text">{count}</span>
									{/if}
								</div>
							{/each}
						{/each}
					</div>
				</div>
			</div>
		</ScrollReveal>
	{/if}
</div>
