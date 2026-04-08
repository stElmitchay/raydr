import { redirect } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID } from '$env/static/private';
import type { RequestHandler } from './$types';

async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export const GET: RequestHandler = async ({ cookies, url }) => {
	const state = crypto.randomUUID();
	const rawNonce = crypto.randomUUID();
	// Supabase's signInWithIdToken hashes (SHA-256) the nonce we pass it and
	// compares to the `nonce` claim in the id_token. Google echoes whatever
	// nonce we sent back, so we must send the HASHED version to Google and
	// keep the RAW version in our cookie to pass to Supabase later.
	const hashedNonce = await sha256Hex(rawNonce);

	cookies.set('google_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600
	});
	cookies.set('google_oauth_nonce', rawNonce, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600
	});

	const redirectUri = `${url.origin}/auth/google/callback`;
	const params = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		nonce: hashedNonce,
		access_type: 'online',
		prompt: 'select_account'
	});

	throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};
