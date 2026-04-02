import { callClaude } from './claude';
import { supabaseAdmin } from './supabase-admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CycleTheme } from '$lib/types';

export async function getCycleTheme(
	supabase: SupabaseClient,
	demoCycle: number,
	seasonId: number | null
): Promise<CycleTheme | null> {
	// Check if theme exists
	const { data: existing } = await supabase
		.from('cycle_themes')
		.select('*')
		.eq('demo_cycle', demoCycle)
		.eq('season', seasonId)
		.single();

	if (existing) return existing;

	// Generate a new theme
	try {
		return await generateCycleTheme(supabase, demoCycle, seasonId);
	} catch {
		return null;
	}
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

	const system = `You are naming monthly demo cycles for Sinai, a developer community platform. Generate a short, evocative theme name (1-3 words) and a one-sentence description for this cycle. The name should feel like a chapter title — aspirational, memorable, and distinct. Think: "Ignition", "First Light", "Deep Roots", "Open Horizon", "Signal Fire".

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
