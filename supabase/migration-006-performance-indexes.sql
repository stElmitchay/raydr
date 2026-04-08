-- ============================================
-- Migration 006: Performance Indexes
-- ============================================
-- Adds indexes to speed up the most common query patterns across the app.
-- Run this in Supabase SQL Editor.

-- Projects: status filter (featured, submitted, draft)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Projects: submitted_by lookups (leaderboard, profiles, project detail ownership)
CREATE INDEX IF NOT EXISTS idx_projects_submitted_by ON projects(submitted_by);

-- Projects: season filter (recaps, season-scoped queries)
CREATE INDEX IF NOT EXISTS idx_projects_season ON projects(season);

-- Projects: demo_cycle filter (recaps, demo day, dashboard)
CREATE INDEX IF NOT EXISTS idx_projects_demo_cycle ON projects(demo_cycle);

-- Projects: composite for the very common (status IN (...) AND demo_cycle = X) query
CREATE INDEX IF NOT EXISTS idx_projects_status_demo_cycle ON projects(status, demo_cycle);

-- Profiles: total_xp DESC for leaderboard
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON profiles(total_xp DESC);

-- Profiles: department filter
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);

-- AI analyses: lookup latest analysis per project
CREATE INDEX IF NOT EXISTS idx_ai_analyses_project_demo ON ai_analyses(project_id, demo_cycle);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_project_analyzed_at ON ai_analyses(project_id, analyzed_at DESC);

-- Milestones: lookup by project + cycle (most milestone queries)
CREATE INDEX IF NOT EXISTS idx_milestones_project_demo ON milestones(project_id, demo_cycle);

-- Next steps: lookup pending vs completed per project
CREATE INDEX IF NOT EXISTS idx_next_steps_project_completed ON next_steps(project_id, completed);

-- Comments: project lookups (chronological)
CREATE INDEX IF NOT EXISTS idx_comments_project_created ON comments(project_id, created_at);

-- Adoptions: project lookups
CREATE INDEX IF NOT EXISTS idx_adoptions_project ON adoptions(project_id);

-- ============================================
-- DONE!
-- ============================================
