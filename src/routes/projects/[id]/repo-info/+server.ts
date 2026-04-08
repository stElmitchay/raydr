import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseRepoUrl, getRepoInfo, getContributors } from '$lib/server/github';

export const GET: RequestHandler = async ({ params, locals: { supabase, session } }) => {
	if (!session?.user?.id) {
		return json({ repoInfo: null, contributors: null });
	}

	// Fetch project repo URL + the user's GitHub token in parallel.
	const [{ data: project }, { data: ghConn }] = await Promise.all([
		supabase.from('projects').select('repo_url').eq('id', params.id).single(),
		supabase.from('github_connections').select('access_token').eq('user_id', session.user.id).single()
	]);

	if (!project?.repo_url || !ghConn?.access_token) {
		return json({ repoInfo: null, contributors: null });
	}

	const parsed = parseRepoUrl(project.repo_url);
	if (!parsed) {
		return json({ repoInfo: null, contributors: null });
	}

	try {
		const [repoInfo, contributors] = await Promise.all([
			getRepoInfo(ghConn.access_token, parsed.owner, parsed.repo),
			getContributors(ghConn.access_token, parsed.owner, parsed.repo)
		]);
		return json({ repoInfo, contributors });
	} catch (err: any) {
		// Don't throw — return null so the UI can show "couldn't load repo info"
		return json({ repoInfo: null, contributors: null, error: err?.message ?? 'GitHub API error' });
	}
};
