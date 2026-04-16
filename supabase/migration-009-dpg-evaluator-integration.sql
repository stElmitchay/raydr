-- ============================================
-- Migration 009: dpg-evaluator skill integration
-- ============================================
-- Adopts the christex-foundation/dpg-evaluator skill as the sole source
-- of DPG analysis. Adds the columns the skill expects on the projects
-- table so it can read inputs and write its results directly. The Raydr
-- web app stops running its own in-app DPG prompt and instead displays
-- whatever the skill last wrote to projects.dpgStatus.
--
-- Run this in the Supabase SQL Editor.

-- The skill writes results here. JSON shape per references/results-schema
-- in the skill: { status: [...], approvalLikelihood, priorityActions, ... }
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "dpgStatus" jsonb;

-- The skill also writes peer/registry matches here.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "matchedDPGs" jsonb;

-- The skill filters teams by published_at IS NOT NULL when running
-- batch evaluations. Backfill below treats every existing project as
-- published so the skill's default scope picks them up.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- The skill reads the repo URL from a column called `github`. Raydr
-- already stores it as `repo_url`, so mirror it via a generated column
-- to avoid touching the dozens of existing references to repo_url.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github text
  GENERATED ALWAYS AS (repo_url) STORED;

-- Backfill: every existing project counts as published for evaluation
-- purposes. New projects can leave this NULL until they're ready.
UPDATE projects SET published_at = created_at WHERE published_at IS NULL;
