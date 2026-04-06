<script lang="ts">
	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let fullName = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	let mode = $state<'login' | 'signup'>('login');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		success = '';

		const supabase = data.supabase;

		if (mode === 'login') {
			const { error: err } = await supabase.auth.signInWithPassword({ email, password });
			if (err) {
				error = err.message;
				loading = false;
				return;
			}
			window.location.href = '/';
		} else {
			if (!fullName.trim()) {
				error = 'Full name is required.';
				loading = false;
				return;
			}

			const { error: err } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: { full_name: fullName.trim() }
				}
			});
			if (err) {
				error = err.message;
				loading = false;
				return;
			}

			success = 'Check your email for a confirmation link!';
		}

		loading = false;
	}
</script>

<div class="flex min-h-[80vh] items-center justify-center px-6">
	<div class="w-full max-w-sm">
		<div class="text-center mb-10">
			<span class="font-serif text-5xl italic text-text">S</span>
			<h1 class="mt-4 heading-page">Sinai TrackAM</h1>
			<p class="mt-2 text-sm text-text-secondary">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</p>
		</div>

		{#if error}
			<div class="border border-negative text-negative text-sm px-4 py-2.5 mb-6">{error}</div>
		{/if}

		{#if success}
			<div class="border border-positive text-positive text-sm px-4 py-2.5 mb-6">{success}</div>
		{:else}
			<form onsubmit={handleSubmit} class="space-y-5">
				{#if mode === 'signup'}
					<div>
						<label for="fullName" class="heading-section block mb-2">Full Name</label>
						<input
							id="fullName"
							type="text"
							bind:value={fullName}
							placeholder="Your full name"
							required
							class="input-editorial"
						/>
					</div>
				{/if}
				<div>
					<label for="email" class="heading-section block mb-2">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						required
						class="input-editorial"
					/>
				</div>
				<div>
					<label for="password" class="heading-section block mb-2">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						placeholder="••••••••"
						required
						minlength="6"
						class="input-editorial"
					/>
				</div>
				<button
					type="submit"
					disabled={loading}
					class="btn-primary w-full py-3 text-sm mt-2"
				>
					{loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
				</button>
			</form>

			<p class="text-center text-sm text-text-secondary mt-6">
				{#if mode === 'login'}
					Don't have an account?
					<button onclick={() => { mode = 'signup'; error = ''; }} class="text-text link-draw">Sign up</button>
				{:else}
					Already have an account?
					<button onclick={() => { mode = 'login'; error = ''; }} class="text-text link-draw">Sign in</button>
				{/if}
			</p>
		{/if}
	</div>
</div>
