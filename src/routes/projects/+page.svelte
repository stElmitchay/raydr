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

	function clearFilters() {
		filterStatus = 'all';
		filterType = 'all';
		sortBy = 'newest';
		applyFilters();
	}

	const statuses = ['all', 'featured', 'submitted', 'draft'] as const;
	const types = ['all', 'internal', 'community'] as const;

	const sortLabels: Record<string, string> = {
		newest: 'Newest',
		cost: 'Most Saved',
		hours: 'Most Hours',
		adoption: 'Most Adopted'
	};

	const activeFilterCount = $derived(
		(filterStatus !== 'all' ? 1 : 0) +
		(filterType !== 'all' ? 1 : 0) +
		(sortBy !== 'newest' ? 1 : 0)
	);

	// Close dropdown on Escape
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') filtersOpen = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="px-5 sm:px-6 md:px-10 lg:px-16 py-10 sm:py-12 max-w-6xl mx-auto">
	<!-- Header -->
	<div class="flex items-baseline justify-between mb-3 animate-fade-up stagger-1">
		<h1 class="heading-page">Projects</h1>
		<a href="/submit" class="btn-primary px-5 py-2 text-sm">Submit</a>
	</div>
	<p class="text-base text-text-secondary mb-8 sm:mb-10 animate-fade-up stagger-2">
		{data.projects.length} {data.projects.length === 1 ? 'project' : 'projects'} from the community
	</p>

	<!-- Filters Bar -->
	<div class="sticky top-14 z-30 bg-bg/90 backdrop-blur-sm border-b border-border py-3 -mx-5 sm:-mx-6 md:-mx-10 lg:-mx-16 px-5 sm:px-6 md:px-10 lg:px-16 animate-fade-up stagger-2">
		<div class="flex items-center gap-3 relative">
			<input
				type="text"
				placeholder="Search projects..."
				bind:value={search}
				onkeydown={(e) => { if (e.key === 'Enter') applyFilters(); }}
				class="input-box text-sm flex-1 py-2 px-3"
			/>

			<!-- Unified Filters button (same on all screen sizes) -->
			<button
				onclick={() => filtersOpen = !filtersOpen}
				class="flex items-center gap-2 px-4 py-2 border border-border text-sm text-text min-h-[44px] hover:bg-surface-alt transition-colors shrink-0"
				aria-expanded={filtersOpen}
				aria-haspopup="true"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
				<span>Filters</span>
				{#if activeFilterCount > 0}
					<span class="text-xs bg-text text-bg px-1.5 py-0.5 font-medium">{activeFilterCount}</span>
				{/if}
			</button>

			<!-- Desktop dropdown panel (anchored below the Filters button) -->
			{#if filtersOpen}
				<div class="hidden sm:block absolute top-full right-0 mt-2 w-80 bg-bg border border-border-strong shadow-2xl z-50 p-6 animate-fade-up">
					<div class="flex items-center justify-between mb-5">
						<h3 class="font-serif text-xl text-text">Filters</h3>
						{#if activeFilterCount > 0}
							<button onclick={clearFilters} class="text-xs text-text-muted link-draw">Clear all</button>
						{/if}
					</div>

					<div class="space-y-5">
						<!-- Status -->
						<div>
							<p class="heading-section mb-2.5">Status</p>
							<div class="flex flex-wrap gap-1.5">
								{#each statuses as status}
									<button
										onclick={() => filterStatus = status}
										class="px-3 py-1.5 text-xs border border-border transition-colors
											{filterStatus === status ? 'bg-text text-bg border-text' : 'text-text-muted hover:text-text'}"
									>
										{status.charAt(0).toUpperCase() + status.slice(1)}
									</button>
								{/each}
							</div>
						</div>

						<!-- Type -->
						<div>
							<p class="heading-section mb-2.5">Type</p>
							<div class="flex flex-wrap gap-1.5">
								{#each types as type}
									<button
										onclick={() => filterType = type}
										class="px-3 py-1.5 text-xs border border-border transition-colors
											{filterType === type ? 'bg-text text-bg border-text' : 'text-text-muted hover:text-text'}"
									>
										{type.charAt(0).toUpperCase() + type.slice(1)}
									</button>
								{/each}
							</div>
						</div>

						<!-- Sort -->
						<div>
							<p class="heading-section mb-2.5">Sort by</p>
							<select bind:value={sortBy} class="input-box text-sm w-full">
								<option value="newest">Newest</option>
								<option value="cost">Most Saved</option>
								<option value="hours">Most Hours</option>
								<option value="adoption">Most Adopted</option>
							</select>
						</div>

						<button
							onclick={() => { applyFilters(); filtersOpen = false; }}
							class="btn-primary w-full text-sm"
						>
							Apply Filters
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Active filter chips (visible when filters applied) -->
		{#if activeFilterCount > 0}
			<div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
				<span class="text-xs text-text-muted uppercase tracking-wider">Active:</span>
				{#if filterStatus !== 'all'}
					<button
						onclick={() => { filterStatus = 'all'; applyFilters(); }}
						class="text-xs px-2 py-1 border border-border bg-surface-alt text-text hover:border-text-muted transition-colors flex items-center gap-1"
					>
						{filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
						<span class="text-text-muted">×</span>
					</button>
				{/if}
				{#if filterType !== 'all'}
					<button
						onclick={() => { filterType = 'all'; applyFilters(); }}
						class="text-xs px-2 py-1 border border-border bg-surface-alt text-text hover:border-text-muted transition-colors flex items-center gap-1"
					>
						{filterType.charAt(0).toUpperCase() + filterType.slice(1)}
						<span class="text-text-muted">×</span>
					</button>
				{/if}
				{#if sortBy !== 'newest'}
					<button
						onclick={() => { sortBy = 'newest'; applyFilters(); }}
						class="text-xs px-2 py-1 border border-border bg-surface-alt text-text hover:border-text-muted transition-colors flex items-center gap-1"
					>
						{sortLabels[sortBy]}
						<span class="text-text-muted">×</span>
					</button>
				{/if}
				<button onclick={clearFilters} class="text-xs text-text-muted link-draw ml-1">Clear all</button>
			</div>
		{/if}
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

<!-- Mobile bottom sheet (and desktop click-outside catcher) -->
{#if filtersOpen}
	<button
		type="button"
		aria-label="Close filters"
		onclick={() => filtersOpen = false}
		class="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
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
				<select bind:value={sortBy} class="input-box text-sm w-full">
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
