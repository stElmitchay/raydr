import type { LayoutServerLoad } from './$types';
import { isDemoDay } from '$lib/server/demo-day';

const PROFILE_COLUMNS =
	'id, email, full_name, avatar_url, department, title, role, github_username, github_connected, total_xp, level, streak, is_admin, created_at';

const SEASON_COLUMNS = 'id, name, start_date, end_date, is_active';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Cookie-only session read — no Supabase Auth network call. We only need
	// session.user.id for the navbar profile lookup; security-critical paths
	// (form actions, mutations) call locals.safeGetSession() themselves.
	const {
		data: { session }
	} = await locals.supabase.auth.getSession();

	const userId = session?.user?.id ?? null;

	const profilePromise = userId
		? locals.supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).single()
		: Promise.resolve({ data: null });

	const seasonPromise = locals.supabase
		.from('seasons')
		.select(SEASON_COLUMNS)
		.eq('is_active', true)
		.single();

	const [profileResult, seasonResult] = await Promise.all([profilePromise, seasonPromise]);

	let profile = profileResult.data ?? null;
	const currentSeason = seasonResult.data ?? null;

	// Auto-create profile fallback (only if the parallel query found nothing).
	// This branch is rare enough that paying the validated-user round-trip is
	// fine — and we want the metadata for the new profile.
	if (userId && !profile) {
		const { user } = await locals.safeGetSession();
		if (user) {
			const { data: newProfile } = await locals.supabase
				.from('profiles')
				.upsert({
					id: user.id,
					email: user.email ?? '',
					full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
					department: ''
				})
				.select(PROFILE_COLUMNS)
				.single();

			if (newProfile) {
				profile = newProfile;
			}
		}
	}

	return {
		session,
		user: session?.user ?? null,
		profile,
		currentSeason,
		isDemoDay: isDemoDay()
	};
};
