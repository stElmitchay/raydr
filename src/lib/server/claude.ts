import { ANTHROPIC_API_KEY } from '$env/static/private';
import type { RepoInfo, CommitData } from './github';
import { AI_XP_PER_MILESTONE_MIN, AI_XP_PER_MILESTONE_MAX, AI_XP_CAP_PER_CYCLE } from '$lib/constants';

interface AnalysisInput {
	commits: CommitData[];
	repoInfo: RepoInfo;
	codeDiffs: string;
	fileTree: string[];
	keyFileContents: Array<{ path: string; content: string }>;
	previousAnalysis?: { milestones: string[]; analyzed_at: string } | null;
	pendingSteps?: Array<{ title: string; description: string }>;
	projectContext: {
		title: string;
		description: string;
		problem_statement: string;
		solution_summary: string;
	};
	dpgGaps?: string[];
}

interface MilestoneResult {
	title: string;
	description: string;
	category: 'feature' | 'bugfix' | 'docs' | 'refactor' | 'test' | 'infra' | 'other';
	suggested_xp: number;
	evidence: string;
}

export interface AnalysisResult {
	summary: string;
	quality_score: number;
	total_suggested_xp: number;
	milestones: MilestoneResult[];
	fulfilled_step_titles: string[];
}

export async function callClaude(system: string, userMessage: string): Promise<string> {
	// Mark the system prompt for ephemeral prompt caching. System prompts here
	// (analysis, DPG eval, idea eval, synthesis, readme, cycle-theme) are all
	// well over the 1024-token caching threshold and are reused across every
	// analysis, so we get ~90% input-token savings on repeat runs within 5 min.
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-20250514',
			max_tokens: 4096,
			system: [
				{
					type: 'text',
					text: system,
					cache_control: { type: 'ephemeral' }
				}
			],
			messages: [{ role: 'user', content: userMessage }]
		})
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Claude API error (${res.status}): ${err}`);
	}

	const data = await res.json();
	return data.content[0].text;
}

export async function analyzeRepoProgress(input: AnalysisInput): Promise<AnalysisResult> {
	const system = `You are a technical project analyst for Raydr, a platform where developers submit and track their projects. Your job is to analyze ACTUAL CODE CHANGES — not just commit messages — to identify concrete milestones achieved.

You have access to:
- The actual code diffs showing what changed
- The repository file tree showing project structure
- Key source files for context
- Commit messages as supplementary information

MILESTONE DETECTION RULES:
1. Every milestone MUST cite specific evidence from the code diffs or file tree. If you can't point to actual code, it's not a milestone.
2. Determine the category from what the code actually does, not what the commit message says. A commit message saying "fix stuff" that adds a new auth system is a "feature", not a "bugfix".
3. Do NOT repeat milestones from previous analyses.
4. Detect: new features (new files, new routes, new components), bug fixes (error handling added, edge cases covered), documentation (README changes, comments), refactors (file restructuring, code cleanup), tests (new test files), infrastructure (CI/CD, Docker, deployment).
5. Score significance based on diff size and structural impact: small tweaks (${AI_XP_PER_MILESTONE_MIN} XP), significant features (${AI_XP_PER_MILESTONE_MAX} XP).
6. Total suggested XP must not exceed ${AI_XP_CAP_PER_CYCLE}.

FULFILLED GOALS:
You may receive a list of pending goals from the previous cycle. Check if the code diffs show these goals were achieved. Return the EXACT titles of fulfilled goals.

Return ONLY a JSON object (no markdown code fences) with this exact structure:
{
  "summary": "2-3 sentence progress overview referencing specific code changes",
  "quality_score": <number 1-10>,
  "total_suggested_xp": <number>,
  "milestones": [
    {
      "title": "short title",
      "description": "what was accomplished",
      "category": "feature|bugfix|docs|refactor|test|infra|other",
      "suggested_xp": <number>,
      "evidence": "file paths and specific changes that prove this milestone"
    }
  ],
  "fulfilled_step_titles": ["exact title of any fulfilled pending goal"]
}`;

	const commitSummary = input.commits.slice(0, 30).map((c) =>
		`- ${c.message.split('\n')[0]} (+${c.additions}/-${c.deletions}) by ${c.author} on ${c.date}`
	).join('\n');

	const keyFilesSection = input.keyFileContents
		.map((f) => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 5000)}\n\`\`\``)
		.join('\n\n');

	const dpgSection = input.dpgGaps?.length
		? `\n## DPG Compliance Gaps (for context)\n${input.dpgGaps.join('\n')}`
		: '';

	const userMessage = `## Project Context
Title: ${input.projectContext.title}
Description: ${input.projectContext.description}
Problem: ${input.projectContext.problem_statement}
Solution: ${input.projectContext.solution_summary}

## Repository Info
Languages: ${Object.keys(input.repoInfo.languages).join(', ')}
Has README: ${input.repoInfo.has_readme}
Stars: ${input.repoInfo.stargazers_count}

## File Tree (${input.fileTree.length} files)
${input.fileTree.slice(0, 200).join('\n')}

## Code Diffs (actual changes since last analysis)
${input.codeDiffs || 'No diffs available — this may be an initial analysis.'}

## Recent Commits (${input.commits.length} total, for supplementary context)
${commitSummary || 'No commits found in this period.'}

## Key Source Files
${keyFilesSection}

${input.previousAnalysis ? `## Previous Milestones (already counted — do NOT repeat)\n${input.previousAnalysis.milestones.join(', ')}` : '## First analysis — no previous milestones.'}

${input.pendingSteps?.length ? `## Pending Goals (check if code diffs fulfill any)\n${input.pendingSteps.map((s) => `- "${s.title}": ${s.description}`).join('\n')}` : '## No pending goals from previous cycle.'}
${dpgSection}

Analyze the CODE DIFFS and file tree to identify NEW milestones achieved. Every milestone must reference specific evidence from the diffs or files. Check if any pending goals were fulfilled by the changes.`;

	const response = await callClaude(system, userMessage);

	const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
	const result: AnalysisResult = JSON.parse(jsonStr);

	// Enforce XP caps on milestones
	result.milestones = (result.milestones || []).map((m) => ({
		...m,
		suggested_xp: Math.max(AI_XP_PER_MILESTONE_MIN, Math.min(AI_XP_PER_MILESTONE_MAX, m.suggested_xp)),
		evidence: m.evidence || ''
	}));
	result.total_suggested_xp = Math.min(
		AI_XP_CAP_PER_CYCLE,
		result.milestones.reduce((sum, m) => sum + m.suggested_xp, 0)
	);

	// Ensure fulfilled_step_titles is always an array
	result.fulfilled_step_titles = result.fulfilled_step_titles || [];

	return result;
}

export async function generateReadme(input: {
	projectTitle: string;
	projectDescription: string;
	problemStatement: string;
	solutionSummary: string;
	techStack: string[];
	aiToolsUsed: string[];
	currentReadme: string | null;
	repoLanguages: string[];
}): Promise<string> {
	const system = `You are a technical writer creating a professional README.md for a software project. Generate a comprehensive, well-structured README using the project's actual data. Include: project overview, the problem it solves, features, tech stack, setup instructions (infer from tech stack), usage, and credits. Do NOT invent features or details not mentioned in the project data. Use proper markdown formatting.`;

	const userMessage = `## Project Details
Title: ${input.projectTitle}
Description: ${input.projectDescription}
Problem: ${input.problemStatement}
Solution: ${input.solutionSummary}
Tech Stack: ${input.techStack.join(', ')}
AI Tools Used: ${input.aiToolsUsed.join(', ')}
Repository Languages: ${input.repoLanguages.join(', ')}

${input.currentReadme ? `## Current README (update and improve this):\n${input.currentReadme}` : '## No existing README — create one from scratch.'}

Generate a complete README.md file.`;

	return callClaude(system, userMessage);
}
