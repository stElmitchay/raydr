<script lang="ts">
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import CostTicker from '$lib/components/ui/CostTicker.svelte';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';

	let { data } = $props();
</script>

<div class="space-y-10">
	<CostTicker targetValue={data.totals?.total_cost_saved ?? 0} />

	<div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
		<StatCard label="Projects" value={(data.totals?.total_projects ?? 0).toString()} accent="primary" />
		<StatCard label="Hours Saved / Week" value={(data.totals?.total_hours_saved ?? 0).toString()} accent="accent" />
		<StatCard label="Adoptions" value={(data.totals?.total_adoptions ?? 0).toString()} accent="success" />
		<StatCard label="Builders" value={(data.totals?.active_builders ?? 0).toString()} accent="primary" />
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<div class="lg:col-span-2 space-y-5">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-display font-semibold text-text tracking-tight">Featured Projects</h2>
				<a href="/projects" class="text-sm text-text-secondary hover:text-primary-light transition-colors">View all &rarr;</a>
			</div>
			{#if data.featuredProjects.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
					{#each data.featuredProjects as project}
						<ProjectCard {project} />
					{/each}
				</div>
			{:else}
				<div class="glass-card p-12 text-center">
					<p class="text-text-muted text-sm">No featured projects yet.</p>
					<a href="/submit" class="mt-2 inline-block text-sm text-primary-light hover:underline">Submit the first one</a>
				</div>
			{/if}
		</div>

		<div class="space-y-5">
			<!-- Department Rankings -->
			<div class="glass-card p-6">
				<h3 class="text-sm font-display font-semibold text-text mb-4">Departments</h3>
				{#if data.departmentStats.length > 0}
					<div class="space-y-3">
						{#each data.departmentStats.slice(0, 5) as dept, i}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2.5">
									<span class="flex h-5 w-5 items-center justify-center rounded text-xs font-bold
										{i === 0 ? 'bg-accent/10 text-accent-light' : 'bg-white/[0.04] text-text-muted'}">
										{i + 1}
									</span>
									<span class="text-sm text-text">{dept.department || 'Unset'}</span>
								</div>
								<span class="text-sm font-medium font-mono text-success tabular-nums">${((dept.total_cost_saved ?? 0) / 1000).toFixed(0)}k</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-text-muted">No data yet</p>
				{/if}
			</div>

			<!-- Active Challenges -->
			{#if data.activeChallenges.length > 0}
				<div class="glass-card p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-sm font-display font-semibold text-text">Challenges</h3>
						<a href="/challenges" class="text-xs text-text-secondary hover:text-primary-light transition-colors">View all &rarr;</a>
					</div>
					<div class="space-y-3">
						{#each data.activeChallenges as challenge}
							{@const daysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
							<a href="/challenges" class="block group">
								<p class="text-sm text-text group-hover:text-primary-light transition-colors">{challenge.title}</p>
								<p class="text-xs text-text-muted">{daysLeft > 0 ? `${daysLeft}d remaining` : 'Ended'}</p>
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Recent -->
			<div class="glass-card p-6">
				<h3 class="text-sm font-display font-semibold text-text mb-4">Recent</h3>
				{#if data.recentProjects.length > 0}
					<div class="space-y-3">
						{#each data.recentProjects as project}
							<a href="/projects/{project.id}" class="block group">
								<p class="text-sm text-text group-hover:text-primary-light transition-colors">{project.title}</p>
								<p class="text-xs text-text-muted">{project.submitter?.full_name ?? 'Unknown'} · W{project.week}</p>
							</a>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-text-muted">No activity yet</p>
				{/if}
			</div>
		</div>
	</div>
</div>
