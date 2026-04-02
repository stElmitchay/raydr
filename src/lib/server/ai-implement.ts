import { callClaude } from './claude';
import {
	getRepoTree,
	getFileContent,
	getRepoInfo,
	createBranch,
	createOrUpdateFile,
	createPullRequest,
	type PullRequestResult
} from './github';

interface ImplementInput {
	token: string;
	owner: string;
	repo: string;
	milestone: {
		title: string;
		description: string;
		category: string;
	};
	projectContext: {
		title: string;
		description: string;
		tech_stack: string[];
	};
}

interface FileChange {
	path: string;
	content: string;
	action: 'create' | 'update';
}

interface ImplementationPlan {
	files: FileChange[];
	pr_title: string;
	pr_body: string;
}

export async function implementMilestone(input: ImplementInput): Promise<PullRequestResult> {
	const { token, owner, repo, milestone, projectContext } = input;

	// Step 1: Get repo info and file tree
	const repoInfo = await getRepoInfo(token, owner, repo);
	const tree = await getRepoTree(token, owner, repo, repoInfo.default_branch);

	// Step 2: Ask Claude which files to read
	const fileSelectionPrompt = `You are analyzing a ${projectContext.tech_stack.join(', ')} project to implement a change. Given the repo file tree and the goal, identify which files need to be read to implement this change. Return ONLY a JSON array of file paths (max 10 most relevant files). Prioritize: entry points, related components, config files, and files likely to be modified.

Return ONLY a JSON array (no markdown fences):
["path/to/file1", "path/to/file2"]`;

	const fileSelectionMessage = `## Goal
${milestone.title}: ${milestone.description}
Category: ${milestone.category}

## Project
${projectContext.title}: ${projectContext.description}
Tech: ${projectContext.tech_stack.join(', ')}
Languages: ${Object.keys(repoInfo.languages).join(', ')}

## Repository File Tree (${tree.length} files)
${tree.slice(0, 500).join('\n')}`;

	const fileSelectionResponse = await callClaude(fileSelectionPrompt, fileSelectionMessage);
	const filePaths: string[] = JSON.parse(
		fileSelectionResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
	);

	// Step 3: Read the selected files
	const fileContents: Array<{ path: string; content: string }> = [];
	let totalSize = 0;
	const maxSize = 50_000; // ~50KB limit to fit in context

	for (const path of filePaths.slice(0, 10)) {
		if (totalSize > maxSize) break;
		const content = await getFileContent(token, owner, repo, path);
		if (content) {
			fileContents.push({ path, content: content.slice(0, 10_000) });
			totalSize += content.length;
		}
	}

	// Step 4: Ask Claude to generate the implementation
	const implementPrompt = `You are a senior developer implementing a feature for a ${projectContext.tech_stack.join(', ')} project. Generate the exact code changes needed. For each file, provide the COMPLETE new content (not a diff). Only include files that need to be changed or created.

Return ONLY a JSON object (no markdown code fences):
{
  "files": [
    { "path": "path/to/file", "content": "complete file content", "action": "create|update" }
  ],
  "pr_title": "short descriptive PR title",
  "pr_body": "markdown description of what was implemented and why"
}

Be precise. Do not add unnecessary changes. Do not remove existing functionality. Keep the existing code style.`;

	const implementMessage = `## Goal
${milestone.title}: ${milestone.description}
Category: ${milestone.category}

## Project Context
${projectContext.title}: ${projectContext.description}

## Existing Files
${fileContents.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')}

## Full File Tree
${tree.slice(0, 200).join('\n')}

Implement the goal. Return the JSON with file changes.`;

	const implementResponse = await callClaude(implementPrompt, implementMessage);
	const plan: ImplementationPlan = JSON.parse(
		implementResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
	);

	if (!plan.files?.length) {
		throw new Error('AI generated no file changes');
	}

	// Step 5: Create branch, commit files, open PR
	const branchName = `sinai/implement-${milestone.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${Date.now()}`;

	await createBranch(token, owner, repo, branchName, repoInfo.default_branch);

	for (const file of plan.files) {
		await createOrUpdateFile(
			token, owner, repo,
			file.path,
			file.content,
			`${file.action === 'create' ? 'feat' : 'update'}: ${milestone.title}\n\nImplemented by Sinai TrackAM AI`,
			branchName
		);
	}

	const pr = await createPullRequest(token, owner, repo, {
		title: plan.pr_title || `feat: ${milestone.title}`,
		body: `${plan.pr_body || milestone.description}\n\n---\n*Implemented by Sinai TrackAM AI*`,
		head: branchName,
		base: repoInfo.default_branch
	});

	return pr;
}
