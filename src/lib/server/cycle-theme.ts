import { callClaude } from './claude';
import { supabaseAdmin } from './supabase-admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CycleTheme } from '$lib/types';

// In-memory throttle so a flood of homepage visits before a theme exists
// only triggers one background generation per (cycle, season) per process.
const generating = new Set<string>();

/**
 * Fast read-only lookup. If the theme isn't cached yet, returns null and
 * fires off background generation (fire-and-forget). NEVER blocks the caller
 * on a Claude API call.
 */
export async function getCycleTheme(
	supabase: SupabaseClient,
	demoCycle: number,
	seasonId: number | null
): Promise<CycleTheme | null> {
	const { data: existing } = await supabase
		.from('cycle_themes')
		.select('*')
		.eq('demo_cycle', demoCycle)
		.eq('season', seasonId)
		.maybeSingle();

	if (existing) return existing;

	// Kick off generation in the background. On serverless hosts that kill
	// the invocation at response time this may not complete — but because
	// the result is persisted to the DB, the next invocation (after the
	// theme is actually written) will serve it.
	const key = `${seasonId ?? 'null'}:${demoCycle}`;
	if (!generating.has(key)) {
		generating.add(key);
		generateCycleTheme(supabase, demoCycle, seasonId).catch((err) => {
			console.error('Background cycle-theme generation failed:', err);
		}).finally(() => {
			generating.delete(key);
		});
	}

	return null;
}

async function generateCycleTheme(
	supabase: SupabaseClient,
	demoCycle: number,
	seasonId: number | null
): Promise<CycleTheme> {
	// Gather context about this cycle's projects
	const { data: projects } = await supabase
		.from('projects')
		.select('title, description, tech_stack')
		.eq('demo_cycle', demoCycle)
		.in('status', ['submitted', 'featured'])
		.limit(10);

	const projectContext = (projects ?? []).length > 0
		? (projects ?? []).map((p: any) => `- ${p.title}: ${p.description}`).join('\n')
		: 'No projects submitted yet for this cycle.';

	const system = `You are naming monthly demo cycles for Raydr, a developer community platform. Generate a short, evocative theme name (1-3 words) and a one-sentence description for this cycle. The name should feel like a chapter title — aspirational, memorable, and distinct. Think: "Ignition", "First Light", "Deep Roots", "Open Horizon", "Signal Fire".

Return ONLY a JSON object (no markdown code fences):
{"name": "Theme Name", "description": "One sentence about the theme"}`;

	const userMessage = `Demo cycle ${demoCycle}. Projects this cycle:\n${projectContext}`;

	const response = await callClaude(system, userMessage);
	const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
	const result = JSON.parse(jsonStr);

	const { data: theme, error } = await supabaseAdmin
		.from('cycle_themes')
		.upsert({
			demo_cycle: demoCycle,
			season: seasonId,
			name: result.name,
			description: result.description
		}, { onConflict: 'demo_cycle,season' })
		.select()
		.single();

	if (error) throw error;
	return theme;
}
