import type { SupabaseClient } from '@supabase/supabase-js';
import { CLAIM_DEADLINE_DAYS, CLAIM_ABANDON_XP_PENALTY } from '$lib/constants';

const THROTTLE_MS = 5 * 60 * 1000;
let lastRunAt = 0;

export async function expireOverdueClaims(supabase: SupabaseClient) {
	const now = Date.now();
	if (now - lastRunAt < THROTTLE_MS) return;
	lastRunAt = now;

	await supabase.rpc('expire_overdue_claims', {
		p_deadline_days: CLAIM_DEADLINE_DAYS,
		p_penalty_xp: CLAIM_ABANDON_XP_PENALTY
	});
}
