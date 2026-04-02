-- ============================================
-- SINAI TRACKER - Migration 003: Next Features
-- ============================================
-- Adds: next_steps, newsletters, DPG evaluation
-- Run this in Supabase SQL Editor AFTER migration-002-platform-evolution.sql

-- ============================================
-- 1. NEXT STEPS TABLE (AI-recommended goals)
-- ============================================

CREATE TABLE IF NOT EXISTS next_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  analysis_id uuid REFERENCES ai_analyses(id) ON DELETE CASCADE,
  demo_cycle integer NOT NULL,
  season integer REFERENCES seasons(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL CHECK (category IN ('feature','bugfix','docs','refactor','test','infra','other')),
  source text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
  estimated_xp integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  fulfilled_by_analysis uuid REFERENCES ai_analyses(id),
  implementation_status text NOT NULL DEFAULT 'pending' CHECK (implementation_status IN ('pending', 'in_progress', 'implemented', 'failed')),
  pr_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_next_steps_project ON next_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_next_steps_analysis ON next_steps(analysis_id);

ALTER TABLE next_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "next_steps_read" ON next_steps FOR SELECT USING (true);
-- Service role writes via supabaseAdmin

-- ============================================
-- 2. DPG EVALUATION COLUMN on ai_analyses
-- ============================================

ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS dpg_evaluation jsonb;

-- ============================================
-- 3. NEWSLETTERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_cycle integer NOT NULL,
  season integer REFERENCES seasons(id),
  title text NOT NULL,
  content_markdown text NOT NULL,
  stats_json jsonb NOT NULL DEFAULT '{}',
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(demo_cycle, season)
);

ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletters_read" ON newsletters FOR SELECT USING (true);
-- Service role writes via supabaseAdmin

-- ============================================
-- 4. ADMIN FLAG ON PROFILES
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ============================================
-- 5. CYCLE THEMES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cycle_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_cycle integer NOT NULL,
  season integer REFERENCES seasons(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(demo_cycle, season)
);

ALTER TABLE cycle_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cycle_themes_read" ON cycle_themes FOR SELECT USING (true);
-- Service role writes via supabaseAdmin

-- ============================================
-- DONE! Migration 003 complete.
-- ============================================
