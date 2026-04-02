<script lang="ts">
	let { data } = $props();
	const projects = $derived(data.projects);
	const milestones = $derived(data.milestones);
	const leaderboard = $derived(data.leaderboard);
	const stats = $derived(data.stats);

	const categoryColors: Record<string, string> = {
		feature: 'tag-primary',
		bugfix: 'tag-danger',
		docs: 'tag-success',
		refactor: 'tag-accent',
		test: 'tag-neutral',
		infra: 'tag-neutral',
		other: 'tag-neutral'
	};

	function timeAgo(dateStr: string): string {
		const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}
</script>

<div class="space-y-8">
	<!-- Hero Banner -->
	<div class="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-accent/5 p-8 md:p-12">
		<div class="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
		<div class="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
		<div class="relative">
			<div class="flex items-center gap-3 mb-3">
				<span class="relative flex h-3 w-3">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
					<span class="relative inline-flex rounded-full h-3 w-3 bg-primary-light"></span>
				</span>
				<span class="text-xs font-medium text-primary-light uppercase tracking-widest">Live</span>
			</div>
			<h1 class="text-4xl md:text-5xl font-display font-bold text-text tracking-tighter">Demo Day</h1>
			<p class="text-lg text-text-secondary mt-2">
				{#if data.cycleTheme}<span class="italic">{data.cycleTheme.name}</span> &middot; {/if}Cycle {data.demoCycle}{data.season ? ` · ${data.season.name}` : ''}
			</p>
			<p class="text-sm text-text-muted mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
		</div>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-5">
		<div class="glass-card p-6 text-center">
			<p class="text-3xl font-bold font-mono text-primary-light">{stats.projectCount}</p>
			<p class="text-xs text-text-muted mt-1 uppercase tracking-wider">Projects</p>
		</div>
		<div class="glass-card p-6 text-center">
			<p class="text-3xl font-bold font-mono text-accent-light">{stats.milestoneCount}</p>
			<p class="text-xs text-text-muted mt-1 uppercase tracking-wider">Milestones</p>
		</div>
		<div class="glass-card p-6 text-center">
			<p class="text-3xl font-bold font-mono text-success">{stats.xpAwarded.toLocaleString()}</p>
			<p class="text-xs text-text-muted mt-1 uppercase tracking-wider">XP Awarded</p>
		</div>
		<div class="glass-card p-6 text-center">
			<p class="text-3xl font-bold font-mono text-text">{stats.departmentCount}</p>
			<p class="text-xs text-text-muted mt-1 uppercase tracking-wider">Departments</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Project Grid -->
		<div class="lg:col-span-2 space-y-5">
			<h2 class="text-xl font-display font-semibold text-text tracking-tight">Cycle Projects ({projects.length})</h2>
			{#if projects.length > 0}
				<div class="space-y-3">
					{#each projects as project}
						<a href="/projects/{project.id}" class="glass-card p-5 block hover:bg-white/[0.04] transition-all duration-200">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<h3 class="text-base font-display font-semibold text-text">{project.title}</h3>
									<p class="text-sm text-text-muted mt-0.5 line-clamp-1">{project.description}</p>
									<div class="flex items-center gap-3 mt-2">
										{#if project.submitter?.avatar_url}
											<img src={project.submitter.avatar_url} alt="" class="h-5 w-5 rounded-full object-cover" />
										{/if}
										<span class="text-xs text-text-secondary">{project.submitter?.full_name ?? 'Unknown'}</span>
										{#if project.annual_cost_replaced}
											<span class="text-xs font-mono text-success">${(project.annual_cost_replaced / 1000).toFixed(0)}k saved</span>
										{/if}
									</div>
								</div>
								<div class="flex flex-col items-end gap-1">
									{#if project.project_type}
										<span class="tag-{project.project_type === 'internal' ? 'accent' : 'primary'} text-xs">{project.project_type}</span>
									{/if}
								</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="glass-card p-12 text-center">
					<p class="text-text-muted text-sm">No projects submitted this cycle yet.</p>
				</div>
			{/if}
		</div>

		<!-- Sidebar: Leaderboard + Milestone Feed -->
		<div class="space-y-5">
			<!-- Cycle Leaderboard -->
			<div class="glass-card p-6">
				<h3 class="text-sm font-display font-semibold text-text mb-4">Leaderboard</h3>
				<div class="space-y-3">
					{#each leaderboard.slice(0, 10) as builder, i}
						<a href="/profiles/{builder.id}" class="flex items-center gap-3 group">
							<span class="flex h-6 w-6 items-center justify-center rounded text-xs font-bold
								{i === 0 ? 'bg-accent/20 text-accent-light' : i === 1 ? 'bg-white/10 text-text' : i === 2 ? 'bg-amber-900/20 text-amber-400' : 'bg-white/[0.04] text-text-muted'}">
								{i + 1}
							</span>
							{#if builder.avatar_url}
								<img src={builder.avatar_url} alt="" class="h-6 w-6 rounded-full object-cover" />
							{:else}
								<div class="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-light">
									{builder.full_name?.charAt(0) ?? '?'}
								</div>
							{/if}
							<span class="text-sm text-text group-hover:text-primary-light transition-colors flex-1 truncate">{builder.full_name}</span>
							<span class="text-xs font-mono text-text-secondary">{builder.total_xp.toLocaleString()} XP</span>
						</a>
					{/each}
				</div>
			</div>

			<!-- Milestone Feed -->
			<div class="glass-card p-6">
				<h3 class="text-sm font-display font-semibold text-text mb-4">Milestone Feed</h3>
				{#if milestones.length > 0}
					<div class="space-y-3">
						{#each milestones.slice(0, 15) as milestone}
							<div class="flex items-start gap-2">
								<span class="{categoryColors[milestone.category] || 'tag-neutral'} text-[10px] shrink-0 mt-0.5">{milestone.category}</span>
								<div class="min-w-0">
									<p class="text-xs text-text">{milestone.title}</p>
									<p class="text-[10px] text-text-muted">{(milestone as any).project?.title ?? ''} · {timeAgo(milestone.created_at)}</p>
								</div>
								{#if milestone.xp_value > 0}
									<span class="text-[10px] font-mono text-primary-light shrink-0 ml-auto">+{milestone.xp_value}</span>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-xs text-text-muted text-center py-4">No milestones yet this cycle</p>
				{/if}
			</div>
		</div>
	</div>
</div>
