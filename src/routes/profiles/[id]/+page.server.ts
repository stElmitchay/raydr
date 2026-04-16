import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { expireOverdueClaims } from '$lib/server/expire-claims';

const PROFILE_COLUMNS =
	'id, email, full_name, avatar_url, department, title, role, github_username, total_xp, level, streak, created_at';

const PROJECT_COLUMNS =
	'id, title, description, status, demo_cycle, week, annual_cost_replaced, estimated_hours_saved_weekly, ai_tools_used, screenshot_urls, created_at, project_type, submitter:profiles!submitted_by(id, full_name, department, avatar_url)';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	// Fire-and-forget throttled expiration so it doesn't block the page.
	expireOverdueClaims(supabase);

	const { data: profile } = await supabase
		.from('profiles')
		.select(PROFILE_COLUMNS)
		.eq('id', params.id)
		.single();

	if (!profile) {
		throw error(404, 'Builder not found');
	}

	const [
		{ data: projects },
		{ data: achievements },
		{ data: claimedRequests },
		{ data: allAchievements }
	] = await Promise.all([
		supabase
			.from('projects')
			.select(PROJECT_COLUMNS)
			.or(`submitted_by.eq.${params.id},team_members.cs.{${params.id}}`)
			.order('created_at', { ascending: false })
			.limit(100),
		supabase
			.from('user_achievements')
			.select('achievement_id, earned_at, achievement:achievements(id, name, icon, description)')
			.eq('user_id', params.id),
		supabase
			.from('tool_requests')
			.select('id, title, description, bonus_xp, claimed_at')
			.eq('claimed_by', params.id)
			.eq('status', 'claimed')
			.order('claimed_at', { ascending: false })
			.limit(50),
		supabase.from('achievements').select('id, name, icon, description')
	]);

	return {
		profile,
		projects: (projects ?? []) as any[],
		earnedAchievements: achievements ?? [],
		allAchievements: allAchievements ?? [],
		claimedRequests: claimedRequests ?? []
	};
};
