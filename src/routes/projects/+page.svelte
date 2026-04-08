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
	let filtersOpen = $state(false);

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

	const activeFilterCount = $derived(
		(filterStatus !== 'all' ? 1 : 0) +
		(filterType !== 'all' ? 1 : 0) +
		(sortBy !== 'newest' ? 1 : 0)
	);
</script>

<div class="px-5 sm:px-6 md:px-10 lg:px-16 py-10 sm:py-12 max-w-6xl mx-auto">
	<!-- Header -->
	<div class="flex items-baseline justify-between mb-3 animate-fade-up stagger-1">
		<h1 class="heading-page">Projects</h1>
		<a href="/submit" class="btn-primary px-5 py-2 text-sm">Submit</a>
	</div>
	<p class="text-base text-text-secondary mb-8 sm:mb-10 animate-fade-up stagger-2">{data.projects.length} {data.projects.length === 1 ? 'project' : 'projects'} from the community</p>

	<!-- Filters -->
	<div class="sticky top-14 z-30 bg-bg/90 backdrop-blur-sm border-b border-border py-3 -mx-5 sm:-mx-6 md:-mx-10 lg:-mx-16 px-5 sm:px-6 md:px-10 lg:px-16 animate-fade-up stagger-2">
		<div class="flex items-center gap-3">
			<input
				type="text"
				placeholder="Search projects..."
				bind:value={search}
				onkeydown={(e) => { if (e.key === 'Enter') applyFilters(); }}
				class="input-box text-sm flex-1 sm:flex-initial sm:w-64 py-2 px-3"
			/>

			<!-- Mobile: Filters button -->
			<button
				onclick={() => filtersOpen = true}
				class="sm:hidden flex items-center gap-2 px-4 py-2 border border-border text-sm text-text min-h-[44px]"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
				Filters
				{#if activeFilterCount > 0}
					<span class="text-xs bg-text text-bg px-1.5 py-0.5">{activeFilterCount}</span>
				{/if}
			</button>

			<!-- Desktop: inline filter pills -->
			<div class="hidden sm:flex border border-border overflow-hidden">
				{#each statuses as status}
					<button
						onclick={() => { filterStatus = status; applyFilters(); }}
						class="px-3 py-2 text-xs font-medium transition-all duration-150 min-h-[36px]
							{filterStatus === status
							? 'bg-text text-bg'
							: 'text-text-muted hover:text-text hover:bg-surface-alt'}"
					>
						{status.charAt(0).toUpperCase() + status.slice(1)}
					</button>
				{/each}
			</div>

			<div class="hidden sm:flex border border-border overflow-hidden">
				{#each types as type}
					<button
						onclick={() => { filterType = type; applyFilters(); }}
						class="px-3 py-2 text-xs font-medium transition-all duration-150 min-h-[36px]
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
				class="hidden sm:block input-box text-sm py-2 px-3 w-auto"
			>
				<option value="newest">Newest</option>
				<option value="cost">Most Saved</option>
				<option value="hours">Most Hours</option>
				<option value="adoption">Most Adopted</option>
			</select>
		</div>
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

<!-- Mobile Filter Drawer -->
{#if filtersOpen}
	<button
		type="button"
		aria-label="Close filters"
		onclick={() => filtersOpen = false}
		class="sm:hidden fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm"
	></button>
	<div class="sm:hidden fixed inset-x-0 bottom-0 z-50 bg-bg border-t border-border-strong px-5 pt-6 pb-8 max-h-[80vh] overflow-y-auto">
		<div class="flex items-center justify-between mb-6">
			<h3 class="font-serif text-2xl text-text">Filters</h3>
			<button
				onclick={() => filtersOpen = false}
				aria-label="Close"
				class="w-11 h-11 flex items-center justify-center text-text-muted hover:text-text"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="space-y-6">
			<!-- Status -->
			<div>
				<p class="heading-section mb-3">Status</p>
				<div class="flex flex-wrap gap-2">
					{#each statuses as status}
						<button
							onclick={() => filterStatus = status}
							class="px-4 py-2 text-sm border border-border min-h-[44px]
								{filterStatus === status ? 'bg-text text-bg border-text' : 'text-text-muted'}"
						>
							{status.charAt(0).toUpperCase() + status.slice(1)}
						</button>
					{/each}
				</div>
			</div>

			<!-- Type -->
			<div>
				<p class="heading-section mb-3">Type</p>
				<div class="flex flex-wrap gap-2">
					{#each types as type}
						<button
							onclick={() => filterType = type}
							class="px-4 py-2 text-sm border border-border min-h-[44px]
								{filterType === type ? 'bg-text text-bg border-text' : 'text-text-muted'}"
						>
							{type.charAt(0).toUpperCase() + type.slice(1)}
						</button>
					{/each}
				</div>
			</div>

			<!-- Sort -->
			<div>
				<p class="heading-section mb-3">Sort</p>
				<select
					bind:value={sortBy}
					class="input-box text-sm w-full"
				>
					<option value="newest">Newest</option>
					<option value="cost">Most Saved</option>
					<option value="hours">Most Hours</option>
					<option value="adoption">Most Adopted</option>
				</select>
			</div>

			<button
				onclick={() => { applyFilters(); filtersOpen = false; }}
				class="btn-primary w-full"
			>
				Apply Filters
			</button>
		</div>
	</div>
{/if}
