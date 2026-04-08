<script lang="ts">
	import '../app.css';
	import NavBar from '$lib/components/layout/NavBar.svelte';
	import FullScreenMenu from '$lib/components/layout/FullScreenMenu.svelte';
	let { children, data } = $props();
	let menuOpen = $state(false);
	let paletteOpen = $state(false);
	let CommandPalette = $state<any>(null);

	async function loadCommandPalette() {
		if (CommandPalette) return;
		const mod = await import('$lib/components/layout/CommandPalette.svelte');
		CommandPalette = mod.default;
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			loadCommandPalette().then(() => {
				paletteOpen = !paletteOpen;
			});
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen bg-bg text-text font-sans antialiased grain-overlay">
	<NavBar
		onToggleMenu={() => menuOpen = !menuOpen}
		user={data.profile}
		session={data.session}
	/>

	<FullScreenMenu
		open={menuOpen}
		onClose={() => menuOpen = false}
		season={data.currentSeason}
		isDemoDay={data.isDemoDay}
	/>

	{#if CommandPalette}
		<CommandPalette
			open={paletteOpen}
			onClose={() => paletteOpen = false}
		/>
	{/if}

	{#if data.isDemoDay}
		<a href="/demo-day" class="fixed top-0 left-0 right-0 z-[60] bg-text text-bg text-center py-1.5 text-xs font-medium tracking-wider uppercase hover:opacity-90 transition-all">
			<span class="inline-flex items-center gap-2">
				<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-bg opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-bg"></span></span>
				Demo Day is Live
			</span>
		</a>
	{/if}

	<main class="{data.isDemoDay ? 'pt-20' : 'pt-14'}">
		{@render children()}
	</main>
</div>
