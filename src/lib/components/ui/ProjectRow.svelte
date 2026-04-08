<script lang="ts">
	import type { Project } from '$lib/types';

	let { project }: { project: Project } = $props();

	function formatCost(val: number | null | undefined): string {
		if (!val) return '—';
		if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M/yr`;
		if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K/yr`;
		return `$${val}/yr`;
	}
</script>

<a href="/projects/{project.id}" class="editorial-row group">
	<!-- Title + submitter -->
	<div class="flex-1 min-w-0 pr-3 sm:pr-6">
		<h3 class="font-serif text-lg sm:text-xl md:text-2xl text-text leading-tight truncate">
			{project.title}
		</h3>
		{#if project.description}
			<p class="text-sm text-text-secondary mt-1.5 line-clamp-1 max-w-2xl leading-relaxed">
				{project.description}
			</p>
		{/if}
		<p class="text-xs text-text-muted mt-2">
			{project.submitter?.full_name ?? 'Anonymous'}
			{#if project.submitter?.department}
				<span>&middot; {project.submitter.department}</span>
			{/if}
		</p>
	</div>

	<!-- Tags -->
	<div class="hidden md:flex items-center gap-1.5 mr-6 flex-shrink-0">
		{#each (project.ai_tools_used ?? []).slice(0, 2) as tool}
			<span class="tag">{tool}</span>
		{/each}
		{#if (project.ai_tools_used ?? []).length > 2}
			<span class="text-xs text-text-muted">+{(project.ai_tools_used?.length ?? 0) - 2}</span>
		{/if}
	</div>

	<!-- Cost -->
	<div class="text-data text-sm sm:text-base flex-shrink-0 text-right w-20 sm:w-28 {project.annual_cost_replaced ? 'text-positive' : 'text-text-muted'}">
		{formatCost(project.annual_cost_replaced)}
	</div>
</a>
