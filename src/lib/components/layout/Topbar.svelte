<script lang="ts">
	import type { Profile } from '$lib/types';
	import type { Session } from '@supabase/supabase-js';
	import { optimizeImage } from '$lib/image';

	let { onToggleSidebar, user = null, session = null }: {
		onToggleSidebar: () => void;
		user: Profile | null;
		session: Session | null;
	} = $props();
</script>

<header class="flex items-center justify-between glass-topbar px-6 h-14 flex-shrink-0 relative z-10">
	<div class="flex items-center gap-3">
		<button
			onclick={onToggleSidebar}
			aria-label="Toggle sidebar"
			class="rounded-lg p-2 text-text-muted hover:text-text hover:bg-white/[0.06] transition-all duration-200"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>
	</div>

	<div class="flex items-center gap-3">
		{#if session}
			<a href="/submit" class="btn-primary px-4 py-2 text-sm">
				New Project
			</a>
			<a href="/profile" class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.06] transition-all duration-200">
				{#if user?.avatar_url}
					<img src={optimizeImage(user.avatar_url, 64)} alt={user.full_name} width="32" height="32" loading="lazy" decoding="async" class="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20" />
				{:else}
					<div class="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary-light ring-2 ring-primary/20">
						{user?.full_name?.charAt(0) ?? '?'}
					</div>
				{/if}
				<span class="text-sm text-text-secondary hidden md:block">{user?.full_name ?? 'Profile'}</span>
			</a>
		{:else}
			<a href="/auth/login" class="btn-primary px-4 py-2 text-sm">
				Sign In
			</a>
		{/if}
	</div>
</header>
