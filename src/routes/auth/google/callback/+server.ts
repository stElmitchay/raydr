import { redirect } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('google_oauth_state');
	const nonce = cookies.get('google_oauth_nonce');

	cookies.delete('google_oauth_state', { path: '/' });
	cookies.delete('google_oauth_nonce', { path: '/' });

	if (!code || !state || !storedState || state !== storedState || !nonce) {
		throw redirect(303, '/auth/login?error=oauth_state_mismatch');
	}

	// Exchange the authorization code for tokens at Google's token endpoint
	const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			redirect_uri: `${url.origin}/auth/google/callback`,
			grant_type: 'authorization_code'
		})
	});

	if (!tokenRes.ok) {
		const text = await tokenRes.text();
		throw redirect(
			303,
			`/auth/login?error=${encodeURIComponent('Google token exchange failed: ' + text.slice(0, 120))}`
		);
	}

	const tokens = (await tokenRes.json()) as { id_token?: string };
	if (!tokens.id_token) {
		throw redirect(303, '/auth/login?error=missing_id_token');
	}

	// Bridge the Google ID token into Supabase. The SSR client writes the
	// session cookie automatically via the cookie handlers in hooks.server.ts.
	const { error } = await supabase.auth.signInWithIdToken({
		provider: 'google',
		token: tokens.id_token,
		nonce
	});

	if (error) {
		throw redirect(303, `/auth/login?error=${encodeURIComponent(error.message)}`);
	}

	throw redirect(303, '/');
};
