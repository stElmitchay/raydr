<script lang="ts">
	import type { Profile } from '$lib/types';
	import type { Session } from '@supabase/supabase-js';

	let { onToggleMenu, user = null, session = null }: {
		onToggleMenu: () => void;
		user: Profile | null;
		session: Session | null;
	} = $props();
</script>

<header class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-6 md:px-10 h-14 bg-bg/80 backdrop-blur-sm border-b border-border/50">
	<!-- Left: Logo -->
	<a href="/" class="flex items-center gap-2.5 link-draw min-h-[44px]">
		<span class="font-serif text-xl text-text">Sinai</span>
	</a>

	<!-- Right: Actions -->
	<div class="flex items-center gap-3 sm:gap-4">
		{#if session}
			<a href="/submit" class="btn-primary px-4 py-1.5 text-sm hidden md:inline-flex">
				Submit
			</a>
			<a href="/profile" class="flex items-center justify-center w-11 h-11">
				{#if user?.avatar_url}
					<img src={user.avatar_url} alt={user.full_name} class="h-9 w-9 rounded-full object-cover" />
				{:else}
					<div class="h-9 w-9 rounded-full bg-surface-alt flex items-center justify-center text-sm font-semibold text-text">
						{user?.full_name?.charAt(0) ?? '?'}
					</div>
				{/if}
			</a>
		{:else}
			<a href="/auth/login" class="btn-primary px-4 py-1.5 text-sm">
				Sign In
			</a>
		{/if}

		<!-- Hamburger -->
		<button
			onclick={onToggleMenu}
			aria-label="Open menu"
			class="flex items-center justify-center w-11 h-11 text-text-secondary hover:text-text transition-colors duration-150"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>
	</div>
</header>
