import { callClaude } from './claude';
import { supabaseAdmin } from './supabase-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function generateNewsletter(
	supabase: SupabaseClient,
	demoCycle: number,
	seasonId: number | null
) {
	// Gather data for the newsletter
	const [
		{ data: projects },
		{ data: milestones },
		{ data: analyses },
		{ data: profiles },
		{ data: departmentStats }
	] = await Promise.all([
		supabase
			.from('projects')
			.select('title, description, annual_cost_replaced, estimated_hours_saved_weekly, tech_stack, ai_tools_used, submitter:profiles!submitted_by(full_name, department)')
			.eq('demo_cycle', demoCycle)
			.in('status', ['submitted', 'featured'])
			.order('annual_cost_replaced', { ascending: false }),
		supabase
			.from('milestones')
			.select('title, category, xp_value')
			.eq('demo_cycle', demoCycle)
			.order('xp_value', { ascending: false })
			.limit(20),
		supabase
			.from('ai_analyses')
			.select('xp_awarded, dpg_evaluation')
			.eq('demo_cycle', demoCycle),
		supabase
			.from('profiles')
			.select('full_name, total_xp, level, department')
			.order('total_xp', { ascending: false })
			.limit(10),
		supabase.rpc('get_department_stats')
	]);

	const projectList = projects ?? [];
	const milestoneList = milestones ?? [];
	const totalXp = (analyses ?? []).reduce((sum: number, a: any) => sum + (a.xp_awarded || 0), 0);
	const dpgScores = (analyses ?? [])
		.filter((a: any) => a.dpg_evaluation)
		.map((a: any) => a.dpg_evaluation.overall_score);
	const avgDpg = dpgScores.length > 0
		? Math.round(dpgScores.reduce((s: number, v: number) => s + v, 0) / dpgScores.length)
		: null;

	const statsData = {
		projectCount: projectList.length,
		totalXpAwarded: totalXp,
		milestoneCount: milestoneList.length,
		avgDpgScore: avgDpg,
		topProjects: projectList.slice(0, 5).map((p: any) => ({
			title: p.title,
			description: p.description,
			costSaved: p.annual_cost_replaced,
			submitter: p.submitter?.full_name
		})),
		topBuilders: (profiles ?? []).slice(0, 5).map((p: any) => ({
			name: p.full_name,
			xp: p.total_xp,
			level: p.level
		}))
	};

	// Generate the newsletter via Claude
	const system = `You are writing a monthly newsletter for Raydr, a platform where developers submit and track their software projects. Write an engaging, concise recap of this demo cycle in markdown format.

Include these sections:
1. **Highlights** — 2-3 sentence overview of the cycle
2. **Top Projects** — brief descriptions of the best projects
3. **Milestones & Achievements** — notable milestones detected by AI
4. **Leaderboard** — top builders and their XP
5. **Department Spotlight** — which departments stood out
6. **Looking Ahead** — brief forward-looking note

Keep the tone professional but celebratory. Do NOT invent data — only use what's provided.`;

	const projectSummaries = projectList.slice(0, 10).map((p: any) =>
		`- **${p.title}** by ${p.submitter?.full_name ?? 'Unknown'}: ${p.description}${p.annual_cost_replaced ? ` ($${(p.annual_cost_replaced / 1000).toFixed(0)}K saved/yr)` : ''}`
	).join('\n');

	const milestoneSummaries = milestoneList.slice(0, 10).map((m: any) =>
		`- [${m.category}] ${m.title} (+${m.xp_value} XP)`
	).join('\n');

	const leaderboardText = (profiles ?? []).slice(0, 5).map((p: any, i: number) =>
		`${i + 1}. ${p.full_name} — ${p.total_xp.toLocaleString()} XP (Level ${p.level})`
	).join('\n');

	const deptText = (departmentStats ?? []).slice(0, 5).map((d: any) =>
		`- ${d.department}: ${d.total_projects} projects, $${((d.total_cost_saved ?? 0) / 1000).toFixed(0)}K saved`
	).join('\n');

	const userMessage = `## Demo Cycle ${demoCycle} Data

### Stats
- Projects submitted: ${projectList.length}
- Total XP awarded: ${totalXp.toLocaleString()}
- Milestones detected: ${milestoneList.length}
${avgDpg !== null ? `- Average DPG compliance: ${avgDpg}/100` : ''}

### Projects
${projectSummaries || 'No projects this cycle.'}

### Key Milestones
${milestoneSummaries || 'No milestones detected.'}

### Leaderboard
${leaderboardText || 'No builders yet.'}

### Department Stats
${deptText || 'No department data.'}

Write the newsletter recap.`;

	const content = await callClaude(system, userMessage);

	// Store the newsletter
	const { data: newsletter, error } = await supabaseAdmin
		.from('newsletters')
		.upsert({
			demo_cycle: demoCycle,
			season: seasonId,
			title: `Demo Cycle ${demoCycle} Recap`,
			content_markdown: content,
			stats_json: statsData
		}, { onConflict: 'demo_cycle,season' })
		.select()
		.single();

	if (error) throw new Error(`Failed to store newsletter: ${error.message}`);
	return newsletter;
}
