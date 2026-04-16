import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { expireOverdueClaims } from '$lib/server/expire-claims';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Cookie-only — we just need a user id (or null) for the "you claimed this" UI.
	expireOverdueClaims(supabase);

	const [{ data: { session } }, requestsResult] = await Promise.all([
		supabase.auth.getSession(),
		supabase
			.from('tool_requests')
			.select(
				'id, title, description, current_tool, current_cost, status, bonus_xp, upvotes, claimed_by, claimed_at, created_at, requester:profiles!requested_by(id, full_name, avatar_url, department), claimer:profiles!claimed_by(id, full_name, avatar_url, department)'
			)
			.order('upvotes', { ascending: false })
			.limit(100)
	]);

	// Supabase infers embedded relations as arrays when given explicit columns;
	// cast to any so templates can access `.requester.full_name` directly.
	return { requests: (requestsResult.data ?? []) as any[], userId: session?.user?.id ?? null };
};

export const actions: Actions = {
	create: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const current_tool = formData.get('current_tool') as string;
		const current_cost = Number(formData.get('current_cost')) || 0;

		if (!title || !description) {
			return fail(400, { error: 'Title and description are required' });
		}

		const { error } = await supabase.from('tool_requests').insert({
			title,
			description,
			current_tool: current_tool || null,
			current_cost,
			requested_by: session.user.id
		});

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	claim: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const id = formData.get('id') as string;

		const { error } = await supabase
			.from('tool_requests')
			.update({ status: 'claimed', claimed_by: session.user.id, claimed_at: new Date().toISOString() })
			.eq('id', id);

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	upvote: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const id = formData.get('id') as string;

		const { error } = await supabase.rpc('increment_upvote', { request_id: id });

		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
