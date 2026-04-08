<script lang="ts">
	import ProjectRow from '$lib/components/ui/ProjectRow.svelte';
	import AchievementMark from '$lib/components/ui/AchievementMark.svelte';
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

	let { data } = $props();
	const profile = $derived(data.profile);
	const projects = $derived(data.projects);
	const earnedAchievements = $derived(data.earnedAchievements);
	const allAchievements = $derived(data.allAchievements);
	const claimedRequests = $derived(data.claimedRequests);

	function daysAgo(dateStr: string): number {
		return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
	}

	const totalCostSaved = $derived(projects.reduce((s: number, p: any) => s + (p.annual_cost_replaced ?? 0), 0));
	const totalHoursSaved = $derived(projects.reduce((s: number, p: any) => s + (p.estimated_hours_saved_weekly ?? 0), 0));
	const earnedIds = $derived(new Set(earnedAchievements.map((ea: any) => ea.achievement_id)));
</script>

<div class="max-w-3xl mx-auto px-5 sm:px-6 md:px-10 py-10 sm:py-12">
	<a href="/profiles" class="text-sm text-text-muted link-draw inline-block mb-8 animate-fade-up stagger-1">&larr; Builders</a>

	<!-- Profile Header -->
	<ScrollReveal>
		<div class="flex items-center gap-5 mb-8">
			{#if profile.avatar_url}
				<img src={profile.avatar_url} alt={profile.full_name} class="h-20 w-20 rounded-full object-cover border-2 border-text" />
			{:else}
				<div class="h-20 w-20 rounded-full bg-surface-alt flex items-center justify-center text-3xl font-serif text-text border-2 border-text">
					{profile.full_name?.charAt(0) ?? '?'}
				</div>
			{/if}
			<div>
				<h1 class="font-serif text-2xl text-text">{profile.full_name}</h1>
				<p class="text-sm text-text-muted">{profile.title || '—'} &middot; {profile.department || '—'}</p>
				<div class="mt-2 flex items-center gap-3">
					<span class="tag">Lv {profile.level ?? 1}</span>
					<span class="text-data text-sm text-text-secondary">{(profile.total_xp ?? 0).toLocaleString()} XP</span>
					{#if profile.streak}
						<span class="text-sm text-text-secondary">{profile.streak} streak</span>
					{/if}
				</div>
			</div>
		</div>
	</ScrollReveal>

	<!-- Stats -->
	<ScrollReveal delay={80}>
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-t border-b border-border mb-8">
			<div class="bg-bg p-4 sm:p-5 text-center">
				<p class="text-data text-lg sm:text-xl text-text">{projects.length}</p>
				<p class="heading-section mt-1">Projects</p>
			</div>
			<div class="bg-bg p-4 sm:p-5 text-center">
				<p class="text-data text-lg sm:text-xl text-positive">${(totalCostSaved / 1000).toFixed(0)}K</p>
				<p class="heading-section mt-1">Saved/yr</p>
			</div>
			<div class="bg-bg p-4 sm:p-5 text-center">
				<p class="text-data text-lg sm:text-xl text-text">{totalHoursSaved}h</p>
				<p class="heading-section mt-1">Saved/wk</p>
			</div>
			<div class="bg-bg p-4 sm:p-5 text-center">
				<p class="text-data text-lg sm:text-xl text-text">{earnedAchievements.length}</p>
				<p class="heading-section mt-1">Badges</p>
			</div>
		</div>
	</ScrollReveal>

	<!-- In Progress -->
	{#if claimedRequests.length > 0}
		<ScrollReveal delay={160}>
			<div class="mb-8">
				<h3 class="heading-section mb-4">In Progress</h3>
				{#each claimedRequests as req, i}
					<div class="py-4 {i > 0 ? 'border-t border-border' : ''}">
						<div class="flex items-center gap-2 mb-1">
							<span class="tag text-[10px]">In Progress</span>
							<span class="text-sm text-text">{req.title}</span>
							{#if req.bonus_xp > 0}
								<span class="text-xs text-data text-text-muted">+{req.bonus_xp} XP</span>
							{/if}
						</div>
						<p class="text-sm text-text-secondary">{req.description}</p>
						<p class="text-xs text-text-muted mt-1">
							Claimed {req.claimed_at ? daysAgo(req.claimed_at) : '?'}d ago
							{#if req.claimed_at && daysAgo(req.claimed_at) > 14}
								<span class="text-negative ml-1">Overdue</span>
							{/if}
						</p>
					</div>
				{/each}
			</div>
		</ScrollReveal>
	{/if}

	<!-- Achievements -->
	{#if allAchievements.length > 0}
		<ScrollReveal delay={240}>
			<div class="mb-8 border-t border-border pt-8">
				<h3 class="heading-section mb-4">Achievements</h3>
				<div class="flex flex-wrap gap-2">
					{#each allAchievements as achievement}
						<AchievementMark
							icon={achievement.icon}
							name={achievement.name}
							earned={earnedIds.has(achievement.id)}
						/>
					{/each}
				</div>
			</div>
		</ScrollReveal>
	{/if}

	<!-- Projects -->
	<ScrollReveal delay={320}>
		<div class="border-t border-border pt-8">
			<h3 class="heading-section mb-4">Projects</h3>
			{#if projects.length > 0}
				{#each projects as project}
					<ProjectRow {project} />
				{/each}
			{:else}
				<p class="text-sm text-text-muted py-8 text-center">No projects yet</p>
			{/if}
		</div>
	</ScrollReveal>
</div>
