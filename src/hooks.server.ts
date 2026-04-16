import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	// Cache the result so multiple callers (hooks, layout, page loads, form actions)
	// share the same auth lookup instead of each making 2 Supabase Auth calls.
	let cached: { session: any; user: any } | null = null;
	event.locals.safeGetSession = async () => {
		if (cached) return cached;

		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			cached = { session: null, user: null };
			return cached;
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			cached = { session: null, user: null };
			return cached;
		}

		cached = { session, user };
		return cached;
	};

	// Note: previously this hook eagerly invoked safeGetSession() and
	// populated event.locals.session/user, which forced an Auth round-trip on
	// every request. We now leave it lazy — consumers that need a validated
	// user must call `await event.locals.safeGetSession()` themselves. The
	// layout uses cookie-only `supabase.auth.getSession()` for navbar profile
	// lookups, which avoids the network call entirely.
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
