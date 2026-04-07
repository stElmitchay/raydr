-- ============================================
-- SINAI TRACKER - Migration 004: Idea Evaluation
-- ============================================
-- Adds: idea_evaluation column on ai_analyses
-- Run this in Supabase SQL Editor AFTER migration-003-next-features.sql

ALTER TABLE ai_analyses ADD COLUMN IF NOT EXISTS idea_evaluation jsonb;

-- ============================================
-- DONE!
-- ============================================
