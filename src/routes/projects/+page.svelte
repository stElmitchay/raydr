<script lang="ts">
	import ProjectRow from '$lib/components/ui/ProjectRow.svelte';
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let search = $state(page.url.searchParams.get('q') || '');
	let filterStatus = $state(page.url.searchParams.get('status') || 'all');
	let filterType = $state(page.url.searchParams.get('type') || 'all');
	let sortBy = $state(page.url.searchParams.get('sort') || 'newest');

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('q', search);
		if (filterStatus !== 'all') params.set('status', filterStatus);
		if (filterType !== 'all') params.set('type', filterType);
		if (sortBy !== 'newest') params.set('sort', sortBy);
		goto(`/projects?${params.toString()}`, { replaceState: true });
	}

	const statuses = ['all', 'featured', 'submitted', 'draft'] as const;
	const types = ['all', 'internal', 'community'] as const;
</script>

<div class="px-6 md:px-10 lg:px-16 py-12 max-w-6xl mx-auto">
	<!-- Header -->
	<div class="flex items-baseline justify-between mb-3 animate-fade-up stagger-1">
		<h1 class="heading-page">Projects</h1>
		<a href="/submit" class="btn-primary px-5 py-2 text-sm">Submit</a>
	</div>
	<p class="text-base text-text-secondary mb-10 animate-fade-up stagger-2">{data.projects.length} {data.projects.length === 1 ? 'project' : 'projects'} from the community</p>

	<!-- Filters -->
	<div class="sticky top-14 z-30 bg-bg/90 backdrop-blur-sm border-b border-border py-3 -mx-6 md:-mx-10 lg:-mx-16 px-6 md:px-10 lg:px-16 flex flex-wrap items-center gap-3 animate-fade-up stagger-2">
		<input
			type="text"
			placeholder="Search..."
			bind:value={search}
			onkeydown={(e) => { if (e.key === 'Enter') applyFilters(); }}
			class="input-box text-sm w-56 py-1.5 px-3"
		/>

		<div class="flex border border-border overflow-hidden">
			{#each statuses as status}
				<button
					onclick={() => { filterStatus = status; applyFilters(); }}
					class="px-3 py-1.5 text-xs font-medium transition-all duration-150
						{filterStatus === status
						? 'bg-text text-bg'
						: 'text-text-muted hover:text-text hover:bg-surface-alt'}"
				>
					{status.charAt(0).toUpperCase() + status.slice(1)}
				</button>
			{/each}
		</div>

		<div class="flex border border-border overflow-hidden">
			{#each types as type}
				<button
					onclick={() => { filterType = type; applyFilters(); }}
					class="px-3 py-1.5 text-xs font-medium transition-all duration-150
						{filterType === type
						? 'bg-text text-bg'
						: 'text-text-muted hover:text-text hover:bg-surface-alt'}"
				>
					{type.charAt(0).toUpperCase() + type.slice(1)}
				</button>
			{/each}
		</div>

		<select
			bind:value={sortBy}
			onchange={applyFilters}
			class="input-box text-sm py-1.5 px-3 w-auto"
		>
			<option value="newest">Newest</option>
			<option value="cost">Most Saved</option>
			<option value="hours">Most Hours</option>
			<option value="adoption">Most Adopted</option>
		</select>
	</div>

	<!-- Project List -->
	<ScrollReveal>
		{#if data.projects.length > 0}
			<div class="mt-2">
				{#each data.projects as project}
					<ProjectRow {project} />
				{/each}
			</div>
		{:else}
			<div class="py-20 text-center border-b border-border">
				<p class="text-text-muted text-sm">No projects found.</p>
				<a href="/submit" class="mt-2 inline-block text-sm text-text link-draw">Submit one</a>
			</div>
		{/if}
	</ScrollReveal>
</div>
