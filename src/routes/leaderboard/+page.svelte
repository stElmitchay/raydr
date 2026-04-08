<script lang="ts">
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

	let { data } = $props();
	let view = $state<'builders' | 'projects'>('builders');
</script>

<div class="px-5 sm:px-6 md:px-10 lg:px-16 py-10 sm:py-12">
	<!-- Header + Toggle -->
	<div class="flex items-baseline justify-between mb-8 sm:mb-10 animate-fade-up stagger-1">
		<h1 class="heading-page">Leaderboard</h1>
		<div class="flex gap-4 text-sm">
			<button
				onclick={() => view = 'builders'}
				class="pb-2 min-h-[44px] transition-all duration-150
					{view === 'builders'
					? 'text-text border-b-2 border-text font-medium'
					: 'text-text-muted hover:text-text'}"
			>Builders</button>
			<button
				onclick={() => view = 'projects'}
				class="pb-2 min-h-[44px] transition-all duration-150
					{view === 'projects'
					? 'text-text border-b-2 border-text font-medium'
					: 'text-text-muted hover:text-text'}"
			>Projects</button>
		</div>
	</div>

	{#if view === 'builders'}
		<!-- Podium -->
		{#if data.builders.length >= 3}
			<ScrollReveal>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border mb-10 sm:mb-12">
					{#each [1, 0, 2] as idx, i}
						{@const builder = data.builders[idx]}
						{@const rankLabels = ['02', '01', '03']}
						{#if builder}
							<div class="bg-bg p-6 md:p-8 text-center {i === 1 ? 'bg-surface-alt py-8 sm:py-10 md:py-12 order-first sm:order-none' : ''}">
								<span class="text-data text-3xl md:text-4xl {i === 1 ? 'text-text' : 'text-text-muted'}">{rankLabels[i]}</span>
								<div class="mt-4">
									{#if builder.avatar_url}
										<img src={builder.avatar_url} alt={builder.full_name} class="h-14 w-14 mx-auto rounded-full object-cover {i === 1 ? 'border-2 border-text' : ''}" />
									{:else}
										<div class="h-14 w-14 mx-auto rounded-full bg-surface-alt flex items-center justify-center text-xl font-semibold text-text {i === 1 ? 'border-2 border-text' : ''}">
											{builder.full_name?.charAt(0) ?? '?'}
										</div>
									{/if}
								</div>
								<h3 class="mt-3 font-serif text-lg text-text">{builder.full_name}</h3>
								<p class="text-xs text-text-muted">{builder.department || '—'}</p>
								<div class="mt-4 flex justify-center gap-6 text-center">
									<div>
										<p class="text-data text-sm text-text">{builder.total_xp ?? 0}</p>
										<p class="heading-section mt-0.5">XP</p>
									</div>
									<div>
										<p class="text-data text-sm text-text">{builder.project_count ?? 0}</p>
										<p class="heading-section mt-0.5">Projects</p>
									</div>
									<div>
										<p class="text-data text-sm text-positive">${((builder.total_saved ?? 0) / 1000).toFixed(0)}K</p>
										<p class="heading-section mt-0.5">Saved</p>
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</ScrollReveal>
		{/if}

		<!-- Full Table -->
		<ScrollReveal>
			<table class="w-full">
				<thead>
					<tr class="border-b border-border-strong">
						<th class="heading-section text-left px-4 py-3 w-12">#</th>
						<th class="heading-section text-left px-4 py-3">Builder</th>
						<th class="heading-section text-left px-4 py-3 hidden md:table-cell">Level</th>
						<th class="heading-section text-right px-4 py-3">XP</th>
						<th class="heading-section text-right px-4 py-3 hidden md:table-cell">Projects</th>
						<th class="heading-section text-right px-4 py-3">Saved</th>
					</tr>
				</thead>
				<tbody>
					{#each data.builders as builder, i}
						<tr class="{i % 2 === 0 ? 'bg-bg' : 'bg-surface-alt'} table-row-hover">
							<td class="px-4 py-3.5 text-data text-sm {builder.rank <= 10 ? 'text-text font-semibold' : 'text-text-muted'}">{builder.rank}</td>
							<td class="px-4 py-3.5">
								<a href="/profiles/{builder.id}" class="flex items-center gap-2.5 group">
									{#if builder.avatar_url}
										<img src={builder.avatar_url} alt={builder.full_name} class="h-7 w-7 rounded-full object-cover" />
									{:else}
										<div class="h-7 w-7 rounded-full bg-surface-alt flex items-center justify-center text-xs font-medium text-text">
											{builder.full_name?.charAt(0) ?? '?'}
										</div>
									{/if}
									<div>
										<p class="text-sm text-text group-hover:text-text-secondary transition-colors">{builder.full_name}</p>
										<p class="text-xs text-text-muted">{builder.department || '—'}</p>
									</div>
								</a>
							</td>
							<td class="px-4 py-3.5 hidden md:table-cell"><span class="tag">Lv{builder.level}</span></td>
							<td class="px-4 py-3.5 text-sm text-data text-text text-right">{(builder.total_xp ?? 0).toLocaleString()}</td>
							<td class="px-4 py-3.5 text-sm text-data text-text text-right hidden md:table-cell">{builder.project_count ?? 0}</td>
							<td class="px-4 py-3.5 text-sm text-data text-positive text-right">${((builder.total_saved ?? 0) / 1000).toFixed(0)}K</td>
						</tr>
					{/each}
					{#if data.builders.length === 0}
						<tr><td colspan="6" class="px-4 py-16 text-center text-sm text-text-muted">No builders yet</td></tr>
					{/if}
				</tbody>
			</table>
		</ScrollReveal>
	{:else}
		<!-- Projects Table -->
		<ScrollReveal>
			<table class="w-full">
				<thead>
					<tr class="border-b border-border-strong">
						<th class="heading-section text-left px-4 py-3 w-12">#</th>
						<th class="heading-section text-left px-4 py-3">Project</th>
						<th class="heading-section text-left px-4 py-3 hidden md:table-cell">Replaces</th>
						<th class="heading-section text-right px-4 py-3">Saved</th>
						<th class="heading-section text-right px-4 py-3">Hours/wk</th>
					</tr>
				</thead>
				<tbody>
					{#each data.projects as project, i}
						<tr class="{i % 2 === 0 ? 'bg-bg' : 'bg-surface-alt'} table-row-hover">
							<td class="px-4 py-3.5 text-data text-sm {i < 10 ? 'text-text font-semibold' : 'text-text-muted'}">{i + 1}</td>
							<td class="px-4 py-3.5">
								<a href="/projects/{project.id}" class="text-sm font-serif text-text hover:text-text-secondary transition-colors">{project.title}</a>
							</td>
							<td class="px-4 py-3.5 text-sm text-text-secondary hidden md:table-cell">{project.replaces_tool || '—'}</td>
							<td class="px-4 py-3.5 text-sm text-data text-positive text-right">${((project.annual_cost_replaced ?? 0) / 1000).toFixed(0)}K</td>
							<td class="px-4 py-3.5 text-sm text-data text-text text-right">{project.estimated_hours_saved_weekly ?? 0}h</td>
						</tr>
					{/each}
					{#if data.projects.length === 0}
						<tr><td colspan="5" class="px-4 py-16 text-center text-sm text-text-muted">No projects yet</td></tr>
					{/if}
				</tbody>
			</table>
		</ScrollReveal>
	{/if}
</div>
