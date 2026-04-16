import type { DpgEvaluatorStatus, DPGEvaluation } from '$lib/types';

/**
 * Adapt the dpg-evaluator skill's output to the shape the existing UI
 * components expect. The skill is the sole source of DPG analysis;
 * this adapter just renames fields so we don't have to touch every
 * Svelte template.
 *
 * Returns null when no evaluation has been run yet (skill writes
 * dpgStatus on completion; absent means "not yet evaluated").
 */
export function adaptDpgStatus(raw: DpgEvaluatorStatus | null | undefined): DPGEvaluation | null {
	if (!raw?.status?.length) return null;

	const checklist = raw.status.map((s, i) => ({
		indicator: i + 1,
		criterion: s.name,
		status: s.overallScore === 1 ? ('pass' as const) : ('fail' as const),
		evidence: s.explanation,
		recommendation: s.recommendation
	}));

	return {
		checklist,
		passing_count: checklist.filter((c) => c.status === 'pass').length,
		approval_likelihood: raw.approvalLikelihood ?? 'low',
		priority_actions: (raw.priorityActions ?? []).map((a) => ({
			priority: a.priority === 'low' ? 'medium' : a.priority,
			action: a.action,
			criterion: a.criterion
		}))
	};
}
