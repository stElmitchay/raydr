<script lang="ts">
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

	let { data } = $props();
	let search = $state('');
	let debouncedSearch = $state('');

	$effect(() => {
		const v = search;
		const t = setTimeout(() => {
			debouncedSearch = v;
		}, 150);
		return () => clearTimeout(t);
	});

	const toolMap = $derived.by(() => {
		const map: Record<string, any[]> = {};
		for (const p of data.projects) {
			const key = p.replaces_tool || 'Internal Process';
			if (!map[key]) map[key] = [];
			map[key].push(p);
		}
		return map;
	});

	const aiTools = $derived([...new Set(data.projects.flatMap((p: any) => p.ai_tools_used ?? []))]);
	const techStack = $derived([...new Set(data.projects.flatMap((p: any) => p.tech_stack ?? []))]);

	let filtered = $derived.by(() => {
		if (!debouncedSearch) return data.projects;
		const q = debouncedSearch.toLowerCase();
		return data.projects.filter((p: any) =>
			p.title?.toLowerCase().includes(q) ||
			p.replaces_tool?.toLowerCase().includes(q) ||
			(p.tech_stack ?? []).some((t: string) => t.toLowerCase().includes(q)) ||
			(p.ai_tools_used ?? []).some((t: string) => t.toLowerCase().includes(q))
		);
	});
</script>

<div class="px-6 md:px-10 lg:px-16 py-10">
	<h1 class="heading-page mb-2 animate-fade-up stagger-1">Catalog</h1>
	<p class="text-sm text-text-muted mb-8 animate-fade-up stagger-2">Every project, searchable</p>

	<input
		type="text"
		placeholder="Search by name, tool, tech..."
		bind:value={search}
		class="input-box text-sm w-72 py-1.5 px-3 mb-8 animate-fade-up stagger-3"
	/>

	<!-- Tag Clouds -->
	{#if aiTools.length > 0 || techStack.length > 0}
		<ScrollReveal>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 border-t border-border pt-8">
				{#if aiTools.length > 0}
					<div>
						<h3 class="heading-section mb-3">AI Tools</h3>
						<p class="text-sm text-text-secondary leading-relaxed">
							{#each aiTools as tool, i}
								{@const count = data.projects.filter((p: any) => (p.ai_tools_used ?? []).includes(tool)).length}
								<span class="text-text">{tool}</span><span class="text-text-muted"> ({count})</span>{#if i < aiTools.length - 1}<span class="text-border-strong"> &middot; </span>{/if}
							{/each}
						</p>
					</div>
				{/if}
				{#if techStack.length > 0}
					<div>
						<h3 class="heading-section mb-3">Tech Stack</h3>
						<p class="text-sm text-text-secondary leading-relaxed">
							{#each techStack as tech, i}
								{@const count = data.projects.filter((p: any) => (p.tech_stack ?? []).includes(tech)).length}
								<span class="text-text">{tech}</span><span class="text-text-muted"> ({count})</span>{#if i < techStack.length - 1}<span class="text-border-strong"> &middot; </span>{/if}
							{/each}
						</p>
					</div>
				{/if}
			</div>
		</ScrollReveal>
	{/if}

	<!-- Tool Replacements -->
	{#if Object.keys(toolMap).length > 0}
		<ScrollReveal>
			<div class="mb-10 border-t border-border pt-8">
				<h3 class="heading-section mb-4">Tool Replacements</h3>
				{#each Object.entries(toolMap) as [tool, projects], i}
					<div class="flex items-center gap-4 py-3 {i > 0 ? 'border-t border-border' : ''}">
						<span class="text-sm text-text-muted line-through w-32 flex-shrink-0">{tool}</span>
						<span class="text-text-muted">&rarr;</span>
						<div class="flex flex-wrap gap-1.5">
							{#each projects as project}
								<a href="/projects/{project.id}" class="text-sm text-text link-draw">{project.title}</a>
								{#if projects.indexOf(project) < projects.length - 1}
									<span class="text-text-muted">,</span>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</ScrollReveal>
	{/if}

	<!-- Projects Table -->
	<ScrollReveal>
		{#if filtered.length > 0}
			<table class="w-full">
				<thead>
					<tr class="border-b border-border-strong">
						<th class="heading-section text-left px-4 py-3">Project</th>
						<th class="heading-section text-left px-4 py-3 hidden md:table-cell">Replaces</th>
						<th class="heading-section text-left px-4 py-3 hidden md:table-cell">AI Tools</th>
						<th class="heading-section text-right px-4 py-3">Saved</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as project, i}
						<tr class="{i % 2 === 0 ? 'bg-bg' : 'bg-surface-alt'} table-row-hover">
							<td class="px-4 py-3.5">
								<a href="/projects/{project.id}" class="text-sm font-serif text-text hover:text-text-secondary transition-colors">{project.title}</a>
							</td>
							<td class="px-4 py-3.5 text-sm text-text-muted hidden md:table-cell">{project.replaces_tool || '—'}</td>
							<td class="px-4 py-3.5 hidden md:table-cell">
								<div class="flex gap-1.5">
									{#each (project.ai_tools_used ?? []).slice(0, 3) as tool}
										<span class="tag">{tool}</span>
									{/each}
								</div>
							</td>
							<td class="px-4 py-3.5 text-sm text-data text-positive text-right">${((project.annual_cost_replaced ?? 0) / 1000).toFixed(0)}K</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<div class="py-20 text-center">
				<p class="text-sm text-text-muted">No projects found</p>
			</div>
		{/if}
	</ScrollReveal>
</div>
