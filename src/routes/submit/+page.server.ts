import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SUBMIT_PROJECT_XP } from '$lib/constants';
import { triggerBackgroundAnalysis } from '$lib/server/analyze';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Cookie-only check — sufficient for a redirect gate. The form action below
	// re-validates with safeGetSession() before doing any writes.
	const { data: { session } } = await supabase.auth.getSession();
	if (!session) {
		throw redirect(303, '/auth/login');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) return fail(401, { error: 'Not authenticated' });

		// Run all read-only setup queries in parallel up-front: profile presence,
		// active season, submitter role. Form parsing happens in parallel too.
		const [
			formData,
			{ data: existingProfile },
			{ data: activeSeason },
			{ data: submitterProfile }
		] = await Promise.all([
			request.formData(),
			supabase.from('profiles').select('id, role').eq('id', session.user.id).maybeSingle(),
			supabase.from('seasons').select('id, start_date').eq('is_active', true).maybeSingle(),
			supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
		]);

		if (!existingProfile) {
			const { error: profileError } = await supabase
				.from('profiles')
				.upsert({
					id: session.user.id,
					email: session.user.email ?? '',
					full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
					department: ''
				});

			if (profileError) {
				return fail(500, { error: `Could not create your profile: ${profileError.message}` });
			}
		}

		const title = (formData.get('title') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const demo_url = (formData.get('demo_url') as string)?.trim();
		const repo_url = (formData.get('repo_url') as string)?.trim();

		if (!title || !description) {
			return fail(400, { error: 'Title and description are required' });
		}

		// Handle media uploads
		const mediaFiles = formData.getAll('media') as File[];
		const validFiles = mediaFiles.filter(f => f instanceof File && f.size > 0);
		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
		const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
		const maxFileSize = 5 * 1024 * 1024; // 5MB

		if (validFiles.length > 5) {
			return fail(400, { error: 'Maximum 5 files allowed' });
		}

		const screenshot_urls: string[] = [];
		for (const file of validFiles) {
			const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();
			if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
				return fail(400, { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, SVG` });
			}
			if (file.size > maxFileSize) {
				return fail(400, { error: `File too large (max 5MB): ${file.name}` });
			}

			const ext = file.name.split('.').pop() || 'png';
			const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

			const { error: uploadError } = await supabase.storage
				.from('project-media')
				.upload(path, file, { contentType: file.type });

			if (uploadError) {
				return fail(500, { error: `Upload failed: ${uploadError.message}` });
			}

			const { data: publicUrl } = supabase.storage
				.from('project-media')
				.getPublicUrl(path);

			screenshot_urls.push(publicUrl.publicUrl);
		}

		let seasonId = activeSeason?.id ?? null;
		let week = 1;
		if (activeSeason) {
			const start = new Date(activeSeason.start_date);
			const now = new Date();
			week = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
		}

		// Calculate demo cycle (month number relative to season start)
		let demoCycle = 1;
		if (activeSeason) {
			const start = new Date(activeSeason.start_date);
			const now = new Date();
			demoCycle = Math.max(1,
				(now.getFullYear() - start.getFullYear()) * 12
				+ (now.getMonth() - start.getMonth())
				+ 1
			);
		}

		// Project type derived from submitter's role (fetched in the parallel block above).
		const projectType = submitterProfile?.role || 'community';

		const { data, error } = await supabase.from('projects').insert({
			title,
			description,
			problem_statement: '',
			solution_summary: '',
			demo_url: demo_url || null,
			repo_url: repo_url || null,
			screenshot_urls,
			submitted_by: session.user.id,
			season: seasonId,
			week,
			demo_cycle: demoCycle,
			project_type: projectType,
			status: 'submitted'
		}).select().single();

		if (error) return fail(500, { error: error.message });

		// Award XP for submitting a project and update streak
		await supabase.rpc('add_xp', { user_id: session.user.id, amount: SUBMIT_PROJECT_XP });
		await supabase.rpc('calculate_monthly_streak', { p_user_id: session.user.id });

		// Fire background AI analysis (non-blocking)
		triggerBackgroundAnalysis(data.id, session.user.id);

		throw redirect(303, `/projects/${data.id}`);
	}
};
