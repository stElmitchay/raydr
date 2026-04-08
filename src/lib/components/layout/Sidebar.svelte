<script lang="ts">
	import { page } from '$app/state';
	import type { Season, Profile } from '$lib/types';

	let { open = true, season = null, user = null, isDemoDay = false }: {
		open: boolean;
		season: Season | null;
		user: Profile | null;
		isDemoDay: boolean;
	} = $props();

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ href: '/projects', label: 'Projects', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
		{ href: '/leaderboard', label: 'Leaderboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
		{ href: '/profiles', label: 'Builders', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
		{ href: '/recaps', label: 'Recaps', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
		{ href: '/challenges', label: 'Challenges', icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
	];
</script>

<aside
	class="flex flex-col glass-sidebar transition-all duration-300 ease-in-out relative z-10 {open
		? 'w-60'
		: 'w-0 overflow-hidden'}"
>
	<!-- Logo -->
	<div class="flex items-center gap-3 px-5 py-6">
		<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)]">
			S
		</div>
		<span class="text-lg font-display font-semibold tracking-tight text-text">Raydr</span>
	</div>

	<!-- Nav -->
	<nav class="flex-1 px-3 space-y-1">
		{#if isDemoDay}
			<a
				href="/demo-day"
				class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 bg-primary/10 text-primary-light border border-primary/20 hover:bg-primary/20"
			>
				<span class="relative flex h-2.5 w-2.5 flex-shrink-0">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
					<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-light"></span>
				</span>
				Demo Day Live
			</a>
		{/if}
		{#each navItems as item}
			{@const isActive = page.url.pathname === item.href || (item.href !== '/' && page.url.pathname.startsWith(item.href))}
			<a
				href={item.href}
				class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
					{isActive
					? 'bg-white/[0.06] text-primary-light border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
					: 'text-text-secondary hover:bg-white/[0.04] hover:text-text hover:translate-x-0.5 border border-transparent'}"
			>
				<svg class="h-[18px] w-[18px] flex-shrink-0 transition-colors duration-200 {isActive ? 'text-primary-light' : 'text-text-muted group-hover:text-text-secondary'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
				</svg>
				{item.label}
			</a>
		{/each}
	</nav>

	<!-- Season Info -->
	<div class="px-3 pb-4">
		{#if season}
			<div class="glass-card px-3 py-2.5 border-t-2 border-t-primary/30">
				<p class="text-xs font-display font-medium text-text">{season.name}</p>
				<p class="text-xs text-text-muted mt-0.5">
					{new Date(season.end_date) > new Date()
						? `Ends ${new Date(season.end_date).toLocaleDateString()}`
						: 'Season ended'}
				</p>
			</div>
		{/if}
	</div>
</aside>
