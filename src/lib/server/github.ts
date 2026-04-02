const GITHUB_API = 'https://api.github.com';

function headers(token: string) {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28'
	};
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
	try {
		const u = new URL(url);
		if (u.hostname !== 'github.com') return null;
		const parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
		if (parts.length < 2 || !parts[0] || !parts[1]) return null;
		return { owner: parts[0], repo: parts[1] };
	} catch {
		return null;
	}
}

export interface RepoInfo {
	name: string;
	description: string | null;
	default_branch: string;
	language: string | null;
	languages: Record<string, number>;
	has_readme: boolean;
	visibility: string;
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
	updated_at: string;
}

export async function getRepoInfo(token: string, owner: string, repo: string): Promise<RepoInfo> {
	const [repoRes, langRes, readmeRes] = await Promise.all([
		fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: headers(token) }),
		fetch(`${GITHUB_API}/repos/${owner}/${repo}/languages`, { headers: headers(token) }),
		fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, { headers: headers(token) })
	]);

	if (!repoRes.ok) {
		throw new GitHubError(repoRes.status, `Failed to fetch repo: ${repoRes.statusText}`);
	}

	const repoData = await repoRes.json();
	const languages = langRes.ok ? await langRes.json() : {};

	return {
		name: repoData.name,
		description: repoData.description,
		default_branch: repoData.default_branch,
		language: repoData.language,
		languages,
		has_readme: readmeRes.ok,
		visibility: repoData.visibility,
		stargazers_count: repoData.stargazers_count,
		forks_count: repoData.forks_count,
		open_issues_count: repoData.open_issues_count,
		updated_at: repoData.updated_at
	};
}

export interface CommitData {
	sha: string;
	message: string;
	author: string;
	date: string;
	additions: number;
	deletions: number;
}

export async function getCommitsSince(
	token: string,
	owner: string,
	repo: string,
	since: Date
): Promise<CommitData[]> {
	const res = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/commits?since=${since.toISOString()}&per_page=100`,
		{ headers: headers(token) }
	);

	if (!res.ok) {
		throw new GitHubError(res.status, `Failed to fetch commits: ${res.statusText}`);
	}

	const commits = await res.json();

	// Fetch individual commit stats (additions/deletions) in parallel, limited to 30
	const detailed = await Promise.all(
		commits.slice(0, 30).map(async (c: any) => {
			const detailRes = await fetch(
				`${GITHUB_API}/repos/${owner}/${repo}/commits/${c.sha}`,
				{ headers: headers(token) }
			);
			const detail = detailRes.ok ? await detailRes.json() : { stats: { additions: 0, deletions: 0 } };
			return {
				sha: c.sha,
				message: c.commit.message,
				author: c.commit.author?.name || c.author?.login || 'Unknown',
				date: c.commit.author?.date || '',
				additions: detail.stats?.additions || 0,
				deletions: detail.stats?.deletions || 0
			};
		})
	);

	return detailed;
}

export async function getContributors(
	token: string,
	owner: string,
	repo: string
): Promise<Array<{ login: string; contributions: number; avatar_url: string }>> {
	const res = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=20`,
		{ headers: headers(token) }
	);

	if (!res.ok) return [];
	return res.json();
}

export async function getReadmeContent(
	token: string,
	owner: string,
	repo: string
): Promise<string | null> {
	const res = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/readme`,
		{
			headers: {
				...headers(token),
				Accept: 'application/vnd.github.raw+json'
			}
		}
	);

	if (!res.ok) return null;
	return res.text();
}

export async function createBranch(
	token: string,
	owner: string,
	repo: string,
	branchName: string,
	fromRef: string
): Promise<void> {
	// Get the SHA of the source ref
	const refRes = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${fromRef}`,
		{ headers: headers(token) }
	);

	if (!refRes.ok) {
		throw new GitHubError(refRes.status, `Failed to get ref: ${refRes.statusText}`);
	}

	const refData = await refRes.json();
	const sha = refData.object.sha;

	// Create the new branch
	const createRes = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/git/refs`,
		{
			method: 'POST',
			headers: headers(token),
			body: JSON.stringify({
				ref: `refs/heads/${branchName}`,
				sha
			})
		}
	);

	if (!createRes.ok) {
		throw new GitHubError(createRes.status, `Failed to create branch: ${createRes.statusText}`);
	}
}

export async function createOrUpdateFile(
	token: string,
	owner: string,
	repo: string,
	path: string,
	content: string,
	message: string,
	branch: string
): Promise<void> {
	// Check if file exists to get its SHA (needed for updates)
	const existingRes = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
		{ headers: headers(token) }
	);

	const body: Record<string, string> = {
		message,
		content: btoa(unescape(encodeURIComponent(content))),
		branch
	};

	if (existingRes.ok) {
		const existing = await existingRes.json();
		body.sha = existing.sha;
	}

	const res = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
		{
			method: 'PUT',
			headers: headers(token),
			body: JSON.stringify(body)
		}
	);

	if (!res.ok) {
		throw new GitHubError(res.status, `Failed to create/update file: ${res.statusText}`);
	}
}

export interface PullRequestResult {
	number: number;
	html_url: string;
	title: string;
}

export async function createPullRequest(
	token: string,
	owner: string,
	repo: string,
	opts: { title: string; body: string; head: string; base: string }
): Promise<PullRequestResult> {
	const res = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/pulls`,
		{
			method: 'POST',
			headers: headers(token),
			body: JSON.stringify(opts)
		}
	);

	if (!res.ok) {
		throw new GitHubError(res.status, `Failed to create PR: ${res.statusText}`);
	}

	return res.json();
}

export async function getRepoTree(
	token: string,
	owner: string,
	repo: string,
	branch: string
): Promise<string[]> {
	const res = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
		{ headers: headers(token) }
	);

	if (!res.ok) {
		throw new GitHubError(res.status, `Failed to fetch repo tree: ${res.statusText}`);
	}

	const data = await res.json();
	return (data.tree ?? [])
		.filter((item: any) => item.type === 'blob')
		.map((item: any) => item.path as string);
}

export async function getFileContent(
	token: string,
	owner: string,
	repo: string,
	path: string,
	ref?: string
): Promise<string | null> {
	const url = ref
		? `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
		: `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;

	const res = await fetch(url, {
		headers: {
			...headers(token),
			Accept: 'application/vnd.github.raw+json'
		}
	});

	if (!res.ok) return null;
	return res.text();
}

export async function getLicenseInfo(
	token: string,
	owner: string,
	repo: string
): Promise<{ license: string | null; spdx_id: string | null }> {
	const res = await fetch(
		`${GITHUB_API}/repos/${owner}/${repo}/license`,
		{ headers: headers(token) }
	);

	if (!res.ok) return { license: null, spdx_id: null };

	const data = await res.json();
	return {
		license: data.license?.name || null,
		spdx_id: data.license?.spdx_id || null
	};
}

export class GitHubError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'GitHubError';
	}
}
