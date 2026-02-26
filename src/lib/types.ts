export interface Profile {
	id: string;
	email: string;
	full_name: string;
	avatar_url?: string;
	department: string;
	title?: string;
	total_xp: number;
	level: number;
	streak: number;
	created_at: string;
}

export interface Project {
	id: string;
	title: string;
	description: string;
	problem_statement: string;
	solution_summary: string;
	demo_url?: string;
	repo_url?: string;
	screenshot_urls: string[];
	video_url?: string;
	tech_stack: string[];
	ai_tools_used: string[];
	replaces_tool?: string;
	annual_cost_replaced: number;
	estimated_hours_saved_weekly: number;
	team_members: string[];
	submitted_by: string;
	season: number;
	week: number;
	status: 'draft' | 'submitted' | 'featured';
	adoption_count: number;
	tool_request_id?: string;
	created_at: string;
	updated_at: string;
	// Joined data
	submitter?: Profile;
}

export interface Achievement {
	id: string;
	name: string;
	description: string;
	icon: string;
	criteria: string;
	xp_reward: number;
}

export interface UserAchievement {
	id: string;
	user_id: string;
	achievement_id: string;
	earned_at: string;
	achievement?: Achievement;
}

export interface Season {
	id: number;
	name: string;
	start_date: string;
	end_date: string;
	is_active: boolean;
}

export interface ToolRequest {
	id: string;
	title: string;
	description: string;
	requested_by: string;
	current_tool?: string;
	current_cost?: number;
	upvotes: number;
	status: 'open' | 'claimed' | 'completed';
	claimed_by?: string;
	claimed_at?: string;
	bonus_xp?: number;
	created_at: string;
}

export interface Comment {
	id: string;
	project_id: string;
	user_id: string;
	content: string;
	created_at: string;
	commenter?: Profile;
}

export interface Adoption {
	id: string;
	project_id: string;
	user_id: string;
	adopted_at: string;
	adopter?: Profile;
}

export interface Challenge {
	id: string;
	season?: number;
	title: string;
	description: string;
	metric: 'cost_saved' | 'projects' | 'hours_saved';
	target: number;
	start_date: string;
	end_date: string;
	is_active: boolean;
	created_at: string;
}

export interface WeeklyStats {
	week: number;
	season: number;
	total_submissions: number;
	total_cost_saved: number;
	total_hours_saved: number;
	participating_teams: number;
}

export interface DepartmentStats {
	department: string;
	total_projects: number;
	total_cost_saved: number;
	total_hours_saved: number;
	active_builders: number;
}
