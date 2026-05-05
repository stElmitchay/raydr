<script lang="ts">
	import type { Project } from '$lib/types';
	import { optimizeImage } from '$lib/image';

	let { project }: { project: Project } = $props();

	function fmt(amount: number): string {
		if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
		return `$${amount}`;
	}
</script>

<a
	href="/projects/{project.id}"
	class="group block glass-card-hover p-6 relative overflow-hidden"
>
	<!-- Gradient overlay on hover -->
	<div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

	<div class="relative">
		<div class="flex items-start justify-between gap-3">
			<h3 class="text-base font-display font-semibold text-text group-hover:text-primary-light transition-colors leading-tight">
				{project.title}
			</h3>
			{#if project.status === 'featured'}
				<span class="tag-accent flex-shrink-0">Featured</span>
			{/if}
		</div>

		<p class="mt-2 text-sm text-text-secondary line-clamp-2 leading-relaxed">{project.description}</p>

		{#if (project.ai_tools_used ?? []).length > 0 || (project.tech_stack ?? []).length > 0}
			<div class="mt-3 flex flex-wrap gap-1.5">
				{#each (project.ai_tools_used ?? []).slice(0, 3) as tool}
					<span class="tag-primary">{tool}</span>
				{/each}
				{#each (project.tech_stack ?? []).slice(0, 2) as tech}
					<span class="tag-neutral">{tech}</span>
				{/each}
			</div>
		{/if}

		<div class="mt-4 flex items-center gap-4 pt-3 border-t border-white/[0.06] text-xs text-text-muted">
			{#if (project.annual_cost_replaced ?? 0) > 0}
				<span class="text-success font-medium font-mono">{fmt(project.annual_cost_replaced)}/yr saved</span>
			{/if}
			{#if (project.estimated_hours_saved_weekly ?? 0) > 0}
				<span class="font-mono">{project.estimated_hours_saved_weekly}h/week saved</span>
			{/if}
			{#if project.replaces_tool}
				<span class="ml-auto">Replaces {project.replaces_tool}</span>
			{/if}
		</div>

		{#if project.submitter}
			<div class="mt-3 flex items-center gap-2">
				{#if project.submitter.avatar_url}
					<img src={optimizeImage(project.submitter.avatar_url, 40)} alt={project.submitter.full_name} width="20" height="20" loading="lazy" decoding="async" class="h-5 w-5 rounded-full object-cover ring-1 ring-white/10" />
				{:else}
					<div class="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-semibold text-primary-light ring-1 ring-white/10">
						{project.submitter.full_name?.charAt(0) ?? '?'}
					</div>
				{/if}
				<span class="text-xs text-text-muted">{project.submitter.full_name ?? 'Unknown'}</span>
				{#if project.submitter.department}
					<span class="text-xs text-text-muted/50">·</span>
					<span class="text-xs text-text-muted/70">{project.submitter.department}</span>
				{/if}
			</div>
		{/if}
	</div>
</a>
