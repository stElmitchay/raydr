<script lang="ts">
	import { enhance } from '$app/forms';
	import ScrollReveal from '$lib/components/ui/ScrollReveal.svelte';

	let { data, form } = $props();
	const profile = $derived(data.profile);

	let editing = $state(false);
	let saved = $state(false);
	let avatarPreview = $state<string | null>(null);
	const githubConnection = $derived(data.githubConnection);
	const githubJustConnected = $derived(data.githubJustConnected);

	function handleAvatarChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => { avatarPreview = reader.result as string; };
			reader.readAsDataURL(file);
		}
	}

	$effect(() => {
		if (form?.success) {
			editing = false;
			saved = true;
			avatarPreview = null;
			setTimeout(() => saved = false, 3000);
		}
	});
</script>

<div class="max-w-2xl mx-auto px-5 sm:px-6 md:px-10 py-10 sm:py-12">
	<!-- Header -->
	<div class="flex items-baseline justify-between mb-8 animate-fade-up stagger-1">
		<h1 class="heading-page">Profile</h1>
		{#if !editing}
			<button onclick={() => editing = true} class="btn-secondary px-4 py-1.5 text-sm">Edit</button>
		{/if}
	</div>

	{#if form?.error}
		<div class="border border-negative text-negative text-sm px-4 py-2.5 mb-6">{form.error}</div>
	{/if}
	{#if saved}
		<div class="border border-positive text-positive text-sm px-4 py-2.5 mb-6">Profile updated.</div>
	{/if}

	{#if editing}
		<!-- Edit Mode -->
		<form
			method="POST"
			action="?/update"
			enctype="multipart/form-data"
			use:enhance={() => {
				return async ({ update }) => { await update(); };
			}}
			class="space-y-6 animate-fade-up"
		>
			<!-- Avatar -->
			<div class="flex items-center gap-6">
				<div class="relative group">
					{#if avatarPreview}
						<img src={avatarPreview} alt="Preview" class="h-20 w-20 rounded-full object-cover border border-border" />
					{:else if profile?.avatar_url}
						<img src={profile.avatar_url} alt={profile.full_name} class="h-20 w-20 rounded-full object-cover border border-border" />
					{:else}
						<div class="h-20 w-20 rounded-full bg-surface-alt flex items-center justify-center text-2xl font-serif text-text border border-border">
							{profile?.full_name?.charAt(0) || '?'}
						</div>
					{/if}
					<label class="absolute inset-0 flex items-center justify-center rounded-full bg-text/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
						<svg class="h-5 w-5 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<input type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" onchange={handleAvatarChange} />
					</label>
				</div>
				<div>
					<p class="text-sm font-medium text-text">Photo</p>
					<p class="text-xs text-text-muted mt-0.5">JPEG, PNG, WebP, or GIF. Max 2MB.</p>
				</div>
			</div>

			<div>
				<label for="full_name" class="heading-section block mb-2">Full Name</label>
				<input id="full_name" name="full_name" type="text" value={profile?.full_name ?? ''} required class="input-editorial" />
			</div>
			<div>
				<label for="department" class="heading-section block mb-2">Department</label>
				<input id="department" name="department" type="text" value={profile?.department ?? ''} placeholder="e.g., Engineering" class="input-editorial" />
			</div>
			<div>
				<label for="title" class="heading-section block mb-2">Job Title</label>
				<input id="title" name="title" type="text" value={profile?.title ?? ''} placeholder="e.g., Senior Developer" class="input-editorial" />
			</div>

			<div class="flex items-center gap-3 pt-4">
				<button type="submit" class="btn-primary px-5 py-2 text-sm">Save</button>
				<button type="button" onclick={() => { editing = false; avatarPreview = null; }} class="btn-secondary px-5 py-2 text-sm">Cancel</button>
			</div>
		</form>
	{:else}
		<!-- View Mode -->
		<ScrollReveal>
			<div class="flex items-center gap-6 mb-8">
				{#if profile?.avatar_url}
					<img src={profile.avatar_url} alt={profile.full_name} class="h-24 w-24 rounded-full object-cover border-2 border-text" />
				{:else}
					<div class="h-24 w-24 rounded-full bg-surface-alt flex items-center justify-center text-3xl font-serif text-text border-2 border-text">
						{profile?.full_name?.charAt(0) || '?'}
					</div>
				{/if}
				<div>
					<h2 class="font-serif text-2xl text-text">{profile?.full_name || 'Unnamed'}</h2>
					{#if profile?.title || profile?.department}
						<p class="text-sm text-text-secondary mt-0.5">
							{profile?.title || '—'}{#if profile?.title && profile?.department} &middot; {/if}{profile?.department || ''}
						</p>
					{/if}
					<p class="text-xs text-text-muted mt-1">{profile?.email}</p>
				</div>
			</div>
		</ScrollReveal>

		<!-- Stats Row -->
		<ScrollReveal delay={80}>
			<div class="flex items-center gap-0 border-t border-b border-border py-6 mb-8">
				<div class="flex-1 text-center">
					<p class="text-data text-2xl text-text">{profile?.level ?? 1}</p>
					<p class="heading-section mt-1">Level</p>
				</div>
				<div class="w-px h-8 bg-border"></div>
				<div class="flex-1 text-center">
					<p class="text-data text-2xl text-text">{(profile?.total_xp ?? 0).toLocaleString()}</p>
					<p class="heading-section mt-1">Total XP</p>
				</div>
				<div class="w-px h-8 bg-border"></div>
				<div class="flex-1 text-center">
					<p class="text-data text-2xl text-text">{profile?.streak ?? 0}</p>
					<p class="heading-section mt-1">Streak</p>
				</div>
			</div>
		</ScrollReveal>
	{/if}

	<!-- GitHub Connection -->
	<ScrollReveal delay={160}>
		<div class="border-b border-border pb-6 mb-6">
			<h3 class="heading-section mb-4">GitHub Connection</h3>
			{#if githubJustConnected}
				<div class="border border-positive text-positive text-sm px-3 py-2 mb-3">GitHub connected successfully!</div>
			{/if}
			{#if githubConnection}
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<svg class="h-5 w-5 text-text-secondary" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
						<div>
							<p class="text-sm text-text">@{githubConnection.github_username}</p>
							<p class="text-xs text-text-muted">Connected {new Date(githubConnection.connected_at).toLocaleDateString()}</p>
						</div>
					</div>
					<form method="POST" action="?/disconnectGithub" use:enhance>
						<button type="submit" class="text-sm text-negative link-draw">Disconnect</button>
					</form>
				</div>
			{:else}
				<div class="flex items-center justify-between gap-4">
					<p class="text-sm text-text-secondary">Connect GitHub for AI analysis and README generation.</p>
					<a href="/auth/github" class="btn-primary px-4 py-1.5 text-sm flex items-center gap-2 shrink-0">
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
						Connect GitHub
					</a>
				</div>
			{/if}
		</div>
	</ScrollReveal>

	<!-- Account -->
	<ScrollReveal delay={240}>
		<div>
			<h3 class="heading-section mb-4">Account</h3>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-text">{profile?.email}</p>
					<p class="text-xs text-text-muted">
						{profile?.role === 'internal' ? 'Internal' : 'Community'}
						&middot; Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
					</p>
				</div>
				<form method="POST" action="?/logout">
					<button type="submit" class="text-sm text-negative link-draw">Sign Out</button>
				</form>
			</div>
		</div>
	</ScrollReveal>
</div>
