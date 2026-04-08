<script lang="ts">
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

	let { data } = $props();

	let search = $state('');
	let filterDept = $state('all');

	const departments = $derived([...new Set(data.profiles.map((p: any) => p.department).filter(Boolean))]);

	let filtered = $derived.by(() => {
		let result = data.profiles;
		if (search) {
			const q = search.toLowerCase();
			result = result.filter((p: any) => p.full_name?.toLowerCase().includes(q) || p.department?.toLowerCase().includes(q));
		}
		if (filterDept !== 'all') {
			result = result.filter((p: any) => p.department === filterDept);
		}
		return result;
	});
</script>

<div class="px-5 sm:px-6 md:px-10 lg:px-16 py-10 sm:py-12">
	<h1 class="heading-page mb-2 animate-fade-up stagger-1">Builders</h1>
	<p class="text-sm text-text-muted mb-8 animate-fade-up stagger-2">{data.profiles.length} people</p>

	<!-- Filters -->
	<div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 animate-fade-up stagger-3">
		<input
			type="text"
			placeholder="Search..."
			bind:value={search}
			class="input-box text-sm flex-1 sm:flex-initial sm:w-56 py-2 px-3"
		/>
		{#if departments.length > 0}
			<select bind:value={filterDept} class="input-box text-sm py-2 px-3 w-full sm:w-auto">
				<option value="all">All Departments</option>
				{#each departments as dept}
					<option value={dept}>{dept}</option>
				{/each}
			</select>
		{/if}
	</div>

	<ScrollReveal>
		{#if filtered.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
				{#each filtered as profile}
					<a href="/profiles/{profile.id}" class="group bg-bg p-5 hover:bg-surface-alt transition-colors">
						<div class="flex items-center gap-3 mb-4">
							{#if profile.avatar_url}
								<img src={profile.avatar_url} alt={profile.full_name} class="h-9 w-9 rounded-full object-cover" />
							{:else}
								<div class="h-9 w-9 rounded-full bg-surface-alt flex items-center justify-center text-sm font-serif text-text">
									{profile.full_name?.charAt(0) ?? '?'}
								</div>
							{/if}
							<div>
								<h3 class="text-sm font-serif text-text group-hover:text-text-secondary transition-colors">{profile.full_name}</h3>
								<p class="text-xs text-text-muted">{profile.title || '—'} &middot; {profile.department || '—'}</p>
							</div>
						</div>
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
							<div>
								<p class="text-data text-sm text-text">{profile.level ?? 1}</p>
								<p class="heading-section">Level</p>
							</div>
							<div>
								<p class="text-data text-sm text-text">{(profile.total_xp ?? 0).toLocaleString()}</p>
								<p class="heading-section">XP</p>
							</div>
							<div>
								<p class="text-data text-sm text-text">{profile.project_count ?? 0}</p>
								<p class="heading-section">Projects</p>
							</div>
							<div>
								<p class="text-data text-sm text-text">{profile.streak ?? 0}</p>
								<p class="heading-section">Streak</p>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="py-20 text-center">
				<p class="text-sm text-text-muted">No builders found</p>
			</div>
		{/if}
	</ScrollReveal>
</div>
