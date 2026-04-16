import { fail, redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase-admin';
import type { Actions, PageServerLoad } from './$types';

const PROFILE_COLUMNS =
	'id, email, full_name, avatar_url, department, title, role, github_username, github_connected, total_xp, level, streak, is_admin, created_at';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, url }) => {
	const { session } = await safeGetSession();
	if (!session) throw redirect(303, '/auth/login');

	const [{ data: profile }, { data: githubConnection }] = await Promise.all([
		supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', session.user.id).single(),
		supabase.from('github_connections').select('github_username, connected_at, scopes').eq('user_id', session.user.id).maybeSingle()
	]);

	return {
		profile,
		githubConnection,
		githubJustConnected: url.searchParams.get('github') === 'connected'
	};
};

export const actions: Actions = {
	update: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const full_name = (formData.get('full_name') as string)?.trim();
		const department = (formData.get('department') as string)?.trim();
		const title = (formData.get('title') as string)?.trim();
		const avatarFile = formData.get('avatar') as File | null;

		if (!full_name) {
			return fail(400, { error: 'Full name is required' });
		}

		const updateData: Record<string, any> = { full_name, department, title };

		// Handle avatar upload
		if (avatarFile && avatarFile.size > 0) {
			if (avatarFile.size > 2 * 1024 * 1024) {
				return fail(400, { error: 'Avatar must be under 2MB' });
			}

			const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
			if (!allowedTypes.includes(avatarFile.type)) {
				return fail(400, { error: 'Avatar must be a JPEG, PNG, WebP, or GIF image' });
			}

			const ext = avatarFile.name.split('.').pop() || 'jpg';
			const filePath = `${session.user.id}/avatar.${ext}`;

			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(filePath, avatarFile, { upsert: true });

			if (uploadError) {
				return fail(500, { error: `Upload failed: ${uploadError.message}` });
			}

			const { data: urlData } = supabase.storage
				.from('avatars')
				.getPublicUrl(filePath);

			// Append cache-buster so browser reloads the new avatar
			updateData.avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
		}

		const { error } = await supabase
			.from('profiles')
			.update(updateData)
			.eq('id', session.user.id);

		if (error) return fail(500, { error: error.message });

		return { success: true };
	},

	disconnectGithub: async ({ locals: { safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		await Promise.all([
			supabaseAdmin
				.from('github_connections')
				.delete()
				.eq('user_id', session.user.id),
			supabaseAdmin
				.from('profiles')
				.update({ github_username: null, github_connected: false })
				.eq('id', session.user.id)
		]);

		return { success: true };
	},

	logout: async ({ locals: { supabase } }) => {
		await supabase.auth.signOut();
		throw redirect(303, '/auth/login');
	}
};
