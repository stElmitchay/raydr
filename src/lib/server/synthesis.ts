import { callClaude } from './claude';
import type { IdeaEvaluation, DPGEvaluation } from '$lib/types';
import type { AnalysisResult } from './claude';
import { AI_XP_PER_MILESTONE_MIN, AI_XP_PER_MILESTONE_MAX } from '$lib/constants';

interface SynthesisInput {
	ideaEval: IdeaEvaluation | null;
	dpgEval: DPGEvaluation | null;
	progressAnalysis: AnalysisResult;
	existingUnfulfilledSteps: Array<{ title: string; description: string }>;
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
		done_when: string;
		category: 'feature' | 'bugfix' | 'docs' | 'refactor' | 'test' | 'infra' | 'other';
		estimated_xp: number;
		rationale: string;
		addresses: string[];
	}>;
}

export async function synthesizeEvaluations(input: SynthesisInput): Promise<SynthesisResult> {
	const { ideaEval, dpgEval, progressAnalysis, existingUnfulfilledSteps, projectContext } = input;

	const system = `You are the lead reviewer for Raydr, a developer platform. You have received independent evaluations of a project and must synthesize them into actionable next steps.

YOU ARE THE SOLE SOURCE OF NEXT STEPS. Your priority_milestones are the ONLY new tasks the developer will see. Make them count.

## Your Inputs
1. **Idea Evaluation** — scores the concept (problem clarity, solution fit, novelty, audience, feasibility, impact)
2. **DPG Evaluation** — pass/fail on 9 Digital Public Goods indicators with code evidence
3. **Progress Analysis** — milestones detected from actual code changes
4. **Existing Unfulfilled Steps** — goals from previous cycles that haven't been completed yet

## Your Job

1. SYNTHESIZE all evaluations into a coherent narrative. Don't concatenate — weave them together.
2. REVIEW existing unfulfilled steps — are they still relevant given the new progress? If a step is now irrelevant (already done differently, or superseded), mention it in your summary so we know.
3. GENERATE 3-5 NEW priority milestones that address the highest-impact gaps across all evaluations. Only generate steps that are genuinely NEW — don't duplicate existing unfulfilled steps.

## Critical: never write DPG counts in prose

The numeric DPG score (e.g., "7/9") is rendered separately in the UI from the deterministic dpg-evaluator output. NEVER include phrases like "passes 7/9", "9/9 criteria", "all 9 indicators", or any other number-of-criteria reference in your "summary", "strengths", or "critical_gaps" fields. Refer to DPG findings qualitatively only — name the specific criteria that pass or fail (e.g., "lacks an open-source license", "documentation is strong"). The badge handles the count; you handle the narrative.

## Rules for generating next steps

Each milestone must be:
- **Specific and actionable**: "Add MIT LICENSE file to repository root" not "Improve licensing"
- **Verifiable**: Include a concrete "done_when" condition that can be checked programmatically or visually
- **Cross-cutting**: Good milestones address multiple evaluation gaps at once (e.g., "Add open source license" fixes DPG criterion 2 AND addresses idea concerns about adoption)
- **Sequenceable**: Order them logically — what should be done first?
- **Tagged**: Each must list which evaluation findings it addresses in the "addresses" array using the format "dpg:criterion-N", "idea:dimension_name", or "progress:gap_description"

XP range: ${AI_XP_PER_MILESTONE_MIN}-${AI_XP_PER_MILESTONE_MAX} per milestone based on effort and impact.

Return ONLY a JSON object (no markdown code fences) with this exact structure:
{
  "summary": "3-5 sentence narrative weaving all evaluations into a coherent picture of where this project stands and what was accomplished",
  "strengths": ["top 3 strengths across all evaluations, concrete and specific"],
  "critical_gaps": ["top 3 critical gaps across all evaluations, concrete and specific"],
  "priority_milestones": [
    {
      "title": "short imperative title — specific and actionable",
      "description": "what to do, why it matters, and how to approach it",
      "done_when": "concrete completion criteria that can be verified (e.g., 'LICENSE file exists in repo root with valid MIT text')",
      "category": "feature|bugfix|docs|refactor|test|infra|other",
      "estimated_xp": <number>,
      "rationale": "which evaluation findings this addresses and why it's a priority NOW",
      "addresses": ["dpg:criterion-2", "idea:feasibility"]
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
		? `## DPG Evaluation (${dpgEval.passing_count}/9 passing — ${dpgEval.approval_likelihood} likelihood)
Failing criteria:
${(dpgEval.checklist || [])
	.filter((c) => c.status === 'fail')
	.map((c) => `- [FAIL] Criterion ${c.indicator} (${c.criterion}): ${c.evidence}\n  Recommendation: ${c.recommendation}`)
	.join('\n') || 'None — all passing'}
Passing criteria:
${(dpgEval.checklist || [])
	.filter((c) => c.status === 'pass')
	.map((c) => `- [PASS] Criterion ${c.indicator} (${c.criterion})`)
	.join('\n') || 'None'}
Priority actions: ${(dpgEval.priority_actions || []).map((a) => `[${a.priority}] ${a.action}`).join('; ') || 'None'}`
		: '## DPG Evaluation: not available';

	const progressSection = `## Progress Analysis (quality ${progressAnalysis.quality_score}/10)
Summary: ${progressAnalysis.summary}
Detected milestones (${progressAnalysis.milestones.length}): ${progressAnalysis.milestones.map((m) => `${m.title} [${m.category}]`).join('; ') || 'None'}`;

	const existingStepsSection = existingUnfulfilledSteps.length
		? `## Existing Unfulfilled Steps (from previous cycles — DO NOT duplicate these)
${existingUnfulfilledSteps.map((s) => `- "${s.title}": ${s.description}`).join('\n')}`
		: '## No existing unfulfilled steps.';

	const userMessage = `## Project Context
Title: ${projectContext.title}
Description: ${projectContext.description}
Problem: ${projectContext.problem_statement}
Solution: ${projectContext.solution_summary}

${ideaSection}

${dpgSection}

${progressSection}

${existingStepsSection}

Synthesize these evaluations. Generate 3-5 NEW priority milestones (don't duplicate existing unfulfilled steps). Each must have a concrete done_when condition and address specific evaluation findings.`;

	const response = await callClaude(system, userMessage);
	const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
	const result: SynthesisResult = JSON.parse(jsonStr);

	// Enforce XP caps and required fields
	result.priority_milestones = (result.priority_milestones || []).map((m) => ({
		...m,
		estimated_xp: Math.max(AI_XP_PER_MILESTONE_MIN, Math.min(AI_XP_PER_MILESTONE_MAX, m.estimated_xp)),
		done_when: m.done_when || '',
		addresses: m.addresses || [],
		rationale: m.rationale || ''
	}));
	result.strengths = result.strengths || [];
	result.critical_gaps = result.critical_gaps || [];

	return result;
}
