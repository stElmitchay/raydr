import { callClaude } from './claude';

interface IdeaInput {
	projectContext: {
		title: string;
		description: string;
		problem_statement: string;
		solution_summary: string;
		project_goals?: string;
		target_audience?: string;
		tech_stack?: string[];
		project_type?: 'internal' | 'community';
	};
}

export interface IdeaEvaluation {
	overall_score: number;
	one_line_verdict: string;
	scores: {
		problem_clarity: number;
		solution_fit: number;
		novelty: number;
		audience_clarity: number;
		feasibility: number;
		impact_potential: number;
	};
	strengths: string[];
	concerns: string[];
	recommendations: string[];
}

export async function evaluateIdea(input: IdeaInput): Promise<IdeaEvaluation> {
	const { projectContext: p } = input;

	const system = `You are evaluating the IDEA behind a software project — not the code, not the execution, just the concept itself. You're a thoughtful product reviewer giving honest, constructive feedback.

Evaluate the project across six dimensions, scoring each from 0-10:

1. **problem_clarity** (0-10): Is the problem well-defined? Does it describe a real pain point?
2. **solution_fit** (0-10): Does the proposed solution actually address the stated problem?
3. **novelty** (0-10): Is this a fresh approach, or a clone of existing tools? (10 = highly novel, 5 = incremental improvement, 0 = pure duplication)
4. **audience_clarity** (0-10): Is it clear who this is for? Is the target audience well-defined?
5. **feasibility** (0-10): Is the scope realistic given the described tech stack? Can a small team actually build this?
6. **impact_potential** (0-10): If successful, could this meaningfully help its target audience?

Be honest. A vague project description should score low on clarity. A "Twitter clone" should score low on novelty. An overambitious scope with weak tech should score low on feasibility. But also be fair — if something is genuinely strong, say so.

Return ONLY a JSON object (no markdown code fences) with this exact structure:
{
  "overall_score": <number 0-100, weighted average of scores * 10>,
  "one_line_verdict": "single sentence summary of the idea's strength",
  "scores": {
    "problem_clarity": <0-10>,
    "solution_fit": <0-10>,
    "novelty": <0-10>,
    "audience_clarity": <0-10>,
    "feasibility": <0-10>,
    "impact_potential": <0-10>
  },
  "strengths": ["2-3 things this idea does well"],
  "concerns": ["2-3 honest concerns or weaknesses"],
  "recommendations": ["2-3 actionable suggestions to strengthen the idea"]
}`;

	const userMessage = `## Project to Evaluate
Title: ${p.title}
Type: ${p.project_type ?? 'community'}
Description: ${p.description}
Problem: ${p.problem_statement}
Solution: ${p.solution_summary}
${p.project_goals ? `Goals: ${p.project_goals}` : ''}
${p.target_audience ? `Target Audience: ${p.target_audience}` : ''}
${p.tech_stack?.length ? `Tech Stack: ${p.tech_stack.join(', ')}` : ''}

Evaluate this idea thoughtfully and honestly.`;

	const response = await callClaude(system, userMessage);
	const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
	const result: IdeaEvaluation = JSON.parse(jsonStr);

	// Clamp scores
	result.overall_score = Math.max(0, Math.min(100, result.overall_score));
	for (const key of Object.keys(result.scores) as Array<keyof typeof result.scores>) {
		result.scores[key] = Math.max(0, Math.min(10, result.scores[key]));
	}

	return result;
}
