import { callClaude } from './claude';
import type { IdeaEvaluation, DPGEvaluation } from '$lib/types';
import type { AnalysisResult } from './claude';
import { AI_XP_PER_MILESTONE_MIN, AI_XP_PER_MILESTONE_MAX } from '$lib/constants';

interface SynthesisInput {
	ideaEval: IdeaEvaluation | null;
	dpgEval: DPGEvaluation | null;
	progressAnalysis: AnalysisResult;
	projectContext: {
		title: string;
		description: string;
		problem_statement: string;
		solution_summary: string;
	};
}

export interface SynthesisResult {
	summary: string;
	strengths: string[];
	critical_gaps: string[];
	priority_milestones: Array<{
		title: string;
		description: string;
		category: 'feature' | 'bugfix' | 'docs' | 'refactor' | 'test' | 'infra' | 'other';
		estimated_xp: number;
		rationale: string;
	}>;
}

export async function synthesizeEvaluations(input: SynthesisInput): Promise<SynthesisResult> {
	const { ideaEval, dpgEval, progressAnalysis, projectContext } = input;

	const system = `You are the lead reviewer for Raydr, a developer platform. You have just received three independent evaluations of a project:

1. **Idea Evaluation** — scores the concept (problem clarity, solution fit, novelty, audience clarity, feasibility, impact)
2. **DPG Evaluation** — scores Digital Public Goods compliance across 9 indicators
3. **Progress Analysis** — detects what was actually built from GitHub commits

Your job is to SYNTHESIZE these into a single coherent view. Don't just concatenate them — weave them together. Identify the *most important things* this project should focus on next, considering all three lenses simultaneously.

Generate 3-5 priority milestones that address the highest-impact gaps. A good milestone might address multiple concerns at once (e.g., "Add open source license" addresses both DPG compliance AND idea concerns about adoption barriers). Each milestone needs a rationale explaining WHICH evaluation(s) it addresses and WHY it's a priority.

Use the same XP scale (${AI_XP_PER_MILESTONE_MIN}-${AI_XP_PER_MILESTONE_MAX}) and category enum (feature|bugfix|docs|refactor|test|infra|other).

Return ONLY a JSON object (no markdown code fences) with this exact structure:
{
  "summary": "3-5 sentence narrative weaving all three evaluations into a coherent picture of where this project stands",
  "strengths": ["top 3 strengths across all evaluations, distinct and concrete"],
  "critical_gaps": ["top 3 critical gaps across all evaluations, distinct and concrete"],
  "priority_milestones": [
    {
      "title": "short imperative title",
      "description": "what to do and why",
      "category": "feature|bugfix|docs|refactor|test|infra|other",
      "estimated_xp": <number>,
      "rationale": "which evaluation(s) this addresses and why it's a priority"
    }
  ]
}`;

	const ideaSection = ideaEval
		? `## Idea Evaluation (${ideaEval.overall_score}/100)
Verdict: ${ideaEval.one_line_verdict}
Scores: problem_clarity=${ideaEval.scores.problem_clarity}, solution_fit=${ideaEval.scores.solution_fit}, novelty=${ideaEval.scores.novelty}, audience_clarity=${ideaEval.scores.audience_clarity}, feasibility=${ideaEval.scores.feasibility}, impact_potential=${ideaEval.scores.impact_potential}
Strengths: ${(ideaEval.strengths || []).join('; ')}
Concerns: ${(ideaEval.concerns || []).join('; ')}
Recommendations: ${(ideaEval.recommendations || []).join('; ')}`
		: '## Idea Evaluation: not available';

	const dpgSection = dpgEval
		? `## DPG Evaluation (${dpgEval.overall_score}/100)
Failing/partial criteria:
${(dpgEval.checklist || [])
	.filter((c) => c.status === 'fail' || c.status === 'partial')
	.map((c) => `- [${c.status}] ${c.criterion}: ${c.reasoning}`)
	.join('\n') || 'None'}`
		: '## DPG Evaluation: not available';

	const progressSection = `## Progress Analysis (quality ${progressAnalysis.quality_score}/10)
Summary: ${progressAnalysis.summary}
Detected milestones (${progressAnalysis.milestones.length}): ${progressAnalysis.milestones.map((m) => m.title).join('; ') || 'None'}
Raw next steps suggested by progress analysis: ${progressAnalysis.next_steps.map((s) => s.title).join('; ') || 'None'}`;

	const userMessage = `## Project Context
Title: ${projectContext.title}
Description: ${projectContext.description}
Problem: ${projectContext.problem_statement}
Solution: ${projectContext.solution_summary}

${ideaSection}

${dpgSection}

${progressSection}

Synthesize these three evaluations into a unified summary, top strengths, critical gaps, and 3-5 priority milestones.`;

	const response = await callClaude(system, userMessage);
	const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
	const result: SynthesisResult = JSON.parse(jsonStr);

	// Enforce XP caps and required fields
	result.priority_milestones = (result.priority_milestones || []).map((m) => ({
		...m,
		estimated_xp: Math.max(AI_XP_PER_MILESTONE_MIN, Math.min(AI_XP_PER_MILESTONE_MAX, m.estimated_xp))
	}));
	result.strengths = result.strengths || [];
	result.critical_gaps = result.critical_gaps || [];

	return result;
}
