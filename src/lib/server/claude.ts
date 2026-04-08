import { ANTHROPIC_API_KEY } from '$env/static/private';
import type { RepoInfo, CommitData } from './github';
import { AI_XP_PER_MILESTONE_MIN, AI_XP_PER_MILESTONE_MAX, AI_XP_CAP_PER_CYCLE } from '$lib/constants';

interface AnalysisInput {
	commits: CommitData[];
	repoInfo: RepoInfo;
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
}

interface NextStepResult {
	title: string;
	description: string;
	category: 'feature' | 'bugfix' | 'docs' | 'refactor' | 'test' | 'infra' | 'other';
	estimated_xp: number;
}

export interface AnalysisResult {
	summary: string;
	quality_score: number;
	total_suggested_xp: number;
	milestones: MilestoneResult[];
	next_steps: NextStepResult[];
	fulfilled_step_titles: string[];
}

export async function callClaude(system: string, userMessage: string): Promise<string> {
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
			system,
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
	const system = `You are a technical project analyst for Raydr, a platform where developers submit and track their projects. Analyze the GitHub repository activity and identify concrete milestones achieved.

For each milestone, categorize it as one of: feature, bugfix, docs, refactor, test, infra, other.
Suggest XP points per milestone (${AI_XP_PER_MILESTONE_MIN}-${AI_XP_PER_MILESTONE_MAX} based on significance).
Total suggested XP must not exceed ${AI_XP_CAP_PER_CYCLE}.

Also generate 3-5 recommended next steps for the upcoming demo cycle. Each should be an actionable goal the developer could achieve. Estimate XP based on difficulty/impact (${AI_XP_PER_MILESTONE_MIN}-${AI_XP_PER_MILESTONE_MAX}).

You may also receive a list of pending goals from the previous cycle. Check if the commits fulfill any of these goals. Return the EXACT titles of fulfilled goals in fulfilled_step_titles.

Return ONLY a JSON object (no markdown code fences) with this exact structure:
{
  "summary": "human-readable progress overview (2-3 sentences)",
  "quality_score": <number 1-10>,
  "total_suggested_xp": <number>,
  "milestones": [
    {
      "title": "short title",
      "description": "what was accomplished",
      "category": "feature|bugfix|docs|refactor|test|infra|other",
      "suggested_xp": <number>
    }
  ],
  "next_steps": [
    {
      "title": "short imperative title",
      "description": "what to do and why",
      "category": "feature|bugfix|docs|refactor|test|infra|other",
      "estimated_xp": <number>
    }
  ],
  "fulfilled_step_titles": ["exact title of any fulfilled pending goal"]
}`;

	const commitSummary = input.commits.slice(0, 30).map(c =>
		`- ${c.message.split('\n')[0]} (+${c.additions}/-${c.deletions}) by ${c.author} on ${c.date}`
	).join('\n');

	const dpgSection = input.dpgGaps?.length
		? `\n## DPG Compliance Gaps (suggest fixes in next_steps)\n${input.dpgGaps.join('\n')}`
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

## Recent Commits (${input.commits.length} total)
${commitSummary || 'No commits found in this period.'}

${input.previousAnalysis ? `## Previous Milestones (already counted)\n${input.previousAnalysis.milestones.join(', ')}` : '## First analysis — no previous milestones.'}

${input.pendingSteps?.length ? `## Pending Goals (check if commits fulfill any)\n${input.pendingSteps.map(s => `- "${s.title}": ${s.description}`).join('\n')}` : '## No pending goals from previous cycle.'}
${dpgSection}
Analyze the commits and identify NEW milestones achieved. Do not repeat milestones from previous analyses. Check if any pending goals were fulfilled. Then suggest next steps for the upcoming demo cycle.`;

	const response = await callClaude(system, userMessage);

	// Parse the JSON response (handle possible markdown fences)
	const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
	const result: AnalysisResult = JSON.parse(jsonStr);

	// Enforce XP caps on milestones
	result.milestones = (result.milestones || []).map(m => ({
		...m,
		suggested_xp: Math.max(AI_XP_PER_MILESTONE_MIN, Math.min(AI_XP_PER_MILESTONE_MAX, m.suggested_xp))
	}));
	result.total_suggested_xp = Math.min(
		AI_XP_CAP_PER_CYCLE,
		result.milestones.reduce((sum, m) => sum + m.suggested_xp, 0)
	);

	// Enforce XP caps on next steps
	result.next_steps = (result.next_steps || []).map(s => ({
		...s,
		estimated_xp: Math.max(AI_XP_PER_MILESTONE_MIN, Math.min(AI_XP_PER_MILESTONE_MAX, s.estimated_xp))
	}));

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
