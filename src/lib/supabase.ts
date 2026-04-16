import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Memoize the browser client at module scope so the layout load doesn't
// reallocate it on every navigation.
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
	if (!cached) {
		cached = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	}
	return cached;
}
