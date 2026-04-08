import type { LayoutServerLoad } from './$types';
import { isDemoDay } from '$lib/server/demo-day';

const PROFILE_COLUMNS =
	'id, email, full_name, avatar_url, department, title, role, github_username, github_connected, total_xp, level, streak, is_admin, created_at';

const SEASON_COLUMNS = 'id, name, start_date, end_date, is_active';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, locals }) => {
	const { session, user } = await safeGetSession();

	// Run profile + season in parallel. Profile is only needed when authenticated.
	const profilePromise = user
		? locals.supabase
				.from('profiles')
				.select(PROFILE_COLUMNS)
				.eq('id', user.id)
				.single()
		: Promise.resolve({ data: null });

	const seasonPromise = locals.supabase
		.from('seasons')
		.select(SEASON_COLUMNS)
		.eq('is_active', true)
		.single();

	const [profileResult, seasonResult] = await Promise.all([profilePromise, seasonPromise]);

	let profile = profileResult.data ?? null;
	const currentSeason = seasonResult.data ?? null;

	// Auto-create profile fallback (only if the parallel query found nothing)
	if (user && !profile) {
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

	return { session, user, profile, currentSeason, isDemoDay: isDemoDay() };
};
