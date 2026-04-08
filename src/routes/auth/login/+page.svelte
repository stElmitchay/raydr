<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import Logo from '$lib/components/ui/Logo.svelte';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let fullName = $state('');
	let otpCode = $state('');
	let pendingEmail = $state('');
	let loading = $state(false);
	let resending = $state(false);
	let error = $state('');
	let info = $state('');
	let mode = $state<'login' | 'signup' | 'verify-otp'>('login');

	// Surface errors returned from OAuth callbacks via ?error=...
	$effect(() => {
		const urlError = page.url.searchParams.get('error');
		if (urlError && !error) {
			error = decodeURIComponent(urlError);
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		info = '';

		const supabase = data.supabase;

		if (mode === 'login') {
			const { error: err } = await supabase.auth.signInWithPassword({ email, password });
			if (err) {
				error = err.message;
				loading = false;
				return;
			}
			await invalidateAll();
			await goto('/');
		} else {
			if (!fullName.trim()) {
				error = 'Full name is required.';
				loading = false;
				return;
			}

			const { data: signUpData, error: err } = await supabase.auth.signUp({
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

			// If a session was returned, email confirmation is disabled in Supabase.
			// The user is already signed in — go straight home.
			if (signUpData?.session) {
				await invalidateAll();
			await goto('/');
				return;
			}

			// Detect "fake" success when the email is already registered.
			// Supabase returns a user with empty `identities` array in that case.
			if (signUpData?.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
				error = 'This email is already registered. Try signing in instead.';
				loading = false;
				return;
			}

			pendingEmail = email;
			otpCode = '';
			mode = 'verify-otp';
		}

		loading = false;
	}

	async function handleVerifyOtp(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';
		info = '';

		const { error: err } = await data.supabase.auth.verifyOtp({
			email: pendingEmail,
			token: otpCode.trim(),
			type: 'email'
		});

		if (err) {
			error = err.message;
			loading = false;
			return;
		}

		await invalidateAll();
			await goto('/');
	}

	async function handleResendOtp() {
		resending = true;
		error = '';
		info = '';

		const { error: err } = await data.supabase.auth.resend({
			type: 'signup',
			email: pendingEmail
		});

		if (err) {
			error = err.message;
		} else {
			info = 'A new code has been sent.';
		}
		resending = false;
	}

	function handleOtpInput(e: Event) {
		const input = e.target as HTMLInputElement;
		// Strip non-digits
		otpCode = input.value.replace(/\D/g, '').slice(0, 6);
	}

	async function handleOAuthSignIn(provider: 'google' | 'github') {
		loading = true;
		error = '';
		info = '';

		const { error: err } = await data.supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: `${window.location.origin}/auth/callback`
			}
		});

		if (err) {
			error = err.message;
			loading = false;
		}
		// On success the browser is redirected to the provider's auth page;
		// no further action needed here.
	}

	const subtitle = $derived(
		mode === 'login'
			? 'Sign in to your account'
			: mode === 'signup'
			? 'Create your account'
			: 'Verify your email'
	);
</script>

<div class="flex min-h-[80vh] items-center justify-center px-6">
	<div class="w-full max-w-sm">
		<div class="text-center mb-10 text-text">
			<div class="flex justify-center">
				<Logo size={64} strokeWidth={2} />
			</div>
			<p class="mt-6 text-sm text-text-secondary">{subtitle}</p>
		</div>

		{#if error}
			<div class="border border-negative text-negative text-sm px-4 py-2.5 mb-6">{error}</div>
		{/if}

		{#if info}
			<div class="border border-positive text-positive text-sm px-4 py-2.5 mb-6">{info}</div>
		{/if}

		{#if mode === 'verify-otp'}
			<p class="text-sm text-text-secondary mb-6 text-center">
				We sent a 6-digit code to <span class="text-text">{pendingEmail}</span>
			</p>
			<form onsubmit={handleVerifyOtp} class="space-y-5">
				<div>
					<label for="otp" class="heading-section block mb-2">Verification code</label>
					<input
						id="otp"
						type="text"
						inputmode="numeric"
						autocomplete="one-time-code"
						value={otpCode}
						oninput={handleOtpInput}
						maxlength="6"
						placeholder="000000"
						required
						class="input-editorial text-center text-3xl tracking-[0.4em] font-mono"
					/>
				</div>
				<button
					type="submit"
					disabled={loading || otpCode.length !== 6}
					class="btn-primary w-full py-3 text-sm mt-2"
				>
					{loading ? 'Verifying…' : 'Verify & Sign In'}
				</button>
			</form>
			<div class="mt-6 text-center text-sm text-text-secondary space-y-3">
				<div>
					<button type="button" onclick={handleResendOtp} disabled={resending} class="text-text link-draw">
						{resending ? 'Sending…' : 'Resend code'}
					</button>
				</div>
				<div>
					<button
						type="button"
						onclick={() => {
							mode = 'signup';
							otpCode = '';
							error = '';
							info = '';
						}}
						class="text-text-muted link-draw"
					>
						Use a different email
					</button>
				</div>
			</div>
		{:else}
			<!-- OAuth Providers -->
			<div class="space-y-3 mb-6">
				<button
					type="button"
					onclick={() => { window.location.href = '/auth/google'; }}
					disabled={loading}
					class="w-full flex items-center justify-center gap-3 border border-border-strong text-text hover:bg-surface-alt transition-colors py-3 text-sm font-medium disabled:opacity-50"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Continue with Google
				</button>
				<button
					type="button"
					onclick={() => handleOAuthSignIn('github')}
					disabled={loading}
					class="w-full flex items-center justify-center gap-3 border border-border-strong text-text hover:bg-surface-alt transition-colors py-3 text-sm font-medium disabled:opacity-50"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
					</svg>
					Continue with GitHub
				</button>
			</div>

			<!-- Divider -->
			<div class="flex items-center gap-4 mb-6">
				<div class="flex-1 h-px bg-border"></div>
				<span class="text-xs text-text-muted uppercase tracking-widest">or</span>
				<div class="flex-1 h-px bg-border"></div>
			</div>

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
					<button onclick={() => { mode = 'signup'; error = ''; info = ''; }} class="text-text link-draw">Sign up</button>
				{:else}
					Already have an account?
					<button onclick={() => { mode = 'login'; error = ''; info = ''; }} class="text-text link-draw">Sign in</button>
				{/if}
			</p>
		{/if}
	</div>
</div>
