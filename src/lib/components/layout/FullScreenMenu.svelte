<script lang="ts">
	import { page } from '$app/state';
	import type { Season } from '$lib/types';

	let { open = false, onClose, season = null, isDemoDay = false }: {
		open: boolean;
		onClose: () => void;
		season: Season | null;
		isDemoDay: boolean;
	} = $props();

	const clusters = $derived([
		...(isDemoDay ? [{
			label: 'Demo Day',
			href: '/demo-day',
			subtitle: 'Live now'
		}] : []),
		{
			label: 'Home',
			href: '/',
			subtitle: 'Overview & metrics'
		},
		{
			label: 'Projects',
			subtitle: 'Browse & submit',
			children: [
				{ href: '/projects', label: 'All Projects' },
				{ href: '/submit', label: 'Submit' },
			]
		},
		{
			label: 'Community',
			subtitle: 'Compete & collaborate',
			children: [
				{ href: '/leaderboard', label: 'Leaderboard' },
				{ href: '/profiles', label: 'Builders' },
				{ href: '/challenges', label: 'Challenges' },
			]
		},
		{
			label: 'Recaps',
			href: '/recaps',
			subtitle: 'Demo recaps & newsletters'
		},
		{
			label: 'Profile',
			href: '/profile',
			subtitle: 'Your account'
		},
	]);

	function handleNav() {
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Overlay -->
	<div
		class="fixed inset-0 z-[100] bg-overlay flex"
		role="dialog"
		aria-modal="true"
		aria-label="Navigation menu"
	>
		<!-- Close button -->
		<button
			onclick={onClose}
			aria-label="Close menu"
			class="absolute top-5 right-6 md:right-10 text-overlay-text/60 hover:text-overlay-text transition-colors duration-150 z-10"
		>
			<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		<!-- Nav Content -->
		<nav class="flex flex-col justify-center px-5 sm:px-8 md:px-16 lg:px-24 w-full max-w-5xl">
			{#each clusters as cluster, i}
				<div
					class="border-b border-overlay-text/10 py-4 md:py-5"
					style="animation: slide-up-stagger 0.5s cubic-bezier(0.16, 1, 0.3, 1) {i * 60}ms both"
				>
					{#if cluster.href}
						<a
							href={cluster.href}
							onclick={handleNav}
							class="group flex items-baseline gap-4"
						>
							<span class="font-serif text-overlay-text text-[clamp(2rem,5vw,3.5rem)] leading-none italic
								{page.url.pathname === cluster.href ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}
								transition-opacity duration-200"
							>
								{cluster.label}
							</span>
							<span class="text-overlay-text/30 text-sm hidden md:inline">{cluster.subtitle}</span>
						</a>
					{:else}
						<div class="group">
							<div class="flex items-baseline gap-4 mb-3">
								<span class="font-serif text-overlay-text/40 text-[clamp(2rem,5vw,3.5rem)] leading-none italic">
									{cluster.label}
								</span>
								<span class="text-overlay-text/20 text-sm hidden md:inline">{cluster.subtitle}</span>
							</div>
							<div class="flex flex-wrap gap-x-6 gap-y-1 pl-1">
								{#each cluster.children ?? [] as child}
									{@const isActive = page.url.pathname === child.href || page.url.pathname.startsWith(child.href + '/')}
									<a
										href={child.href}
										onclick={handleNav}
										class="text-lg md:text-xl text-overlay-text/60 hover:text-overlay-text transition-colors duration-150
											{isActive ? 'text-overlay-text' : ''}"
									>
										{child.label}
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}

			<!-- Season info at bottom -->
			{#if season}
				<div
					class="mt-8 text-overlay-text/30 text-xs uppercase tracking-widest"
					style="animation: slide-up-stagger 0.5s cubic-bezier(0.16, 1, 0.3, 1) {clusters.length * 60}ms both"
				>
					{season.name}
					{#if new Date(season.end_date) > new Date()}
						&mdash; ends {new Date(season.end_date).toLocaleDateString()}
					{/if}
				</div>
			{/if}
		</nav>
	</div>
{/if}
