-- ============================================
-- Migration 008: Missing indexes + batched claim expiration
-- ============================================
-- Adds the indexes that were missing for the app's most common query
-- patterns, and replaces the N+1 JS loop in expire-claims.ts with a
-- single server-side function call.
--
-- Run this in the Supabase SQL Editor.

-- ---------------------------------------------
-- Projects: team_members array containment
-- ---------------------------------------------
-- The profile page queries `team_members @> ARRAY[user_id]`. Without a
-- GIN index this is a sequential scan on every visit.
CREATE INDEX IF NOT EXISTS idx_projects_team_members_gin
    ON projects USING GIN (team_members);

-- ---------------------------------------------
-- Projects: composite for calculate_monthly_streak and similar RPCs
-- that filter (submitted_by, demo_cycle, status).
-- ---------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_submitted_by_demo_cycle_status
    ON projects (submitted_by, demo_cycle, status);

-- ---------------------------------------------
-- tool_requests: claim expiration scan
-- ---------------------------------------------
-- expire_overdue_claims filters status='claimed' AND claimed_at < deadline.
CREATE INDEX IF NOT EXISTS idx_tool_requests_status_claimed_at
    ON tool_requests (status, claimed_at);

-- Profile page: list claims by a specific user.
CREATE INDEX IF NOT EXISTS idx_tool_requests_claimed_by_status
    ON tool_requests (claimed_by, status);

-- ---------------------------------------------
-- Challenges: active + end_date window
-- ---------------------------------------------
-- Guarded — the challenges table comes from migration-001 and may not
-- exist on all environments.
DO $$
BEGIN
    IF to_regclass('public.challenges') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_challenges_active_end
            ON challenges (is_active, end_date);
    END IF;
END $$;

-- ============================================
-- Batched claim expiration function
-- ============================================
-- Replaces the per-row loop in src/lib/server/expire-claims.ts with a
-- single SQL round-trip that:
--   1. Moves overdue claimed requests back to 'open' and bumps bonus_xp.
--   2. Deducts the abandon penalty from each former claimer's XP.
--
-- p_deadline_days — how long a claim may sit before it expires
-- p_penalty_xp    — XP removed from the claimer and added to the bounty
CREATE OR REPLACE FUNCTION expire_overdue_claims(
    p_deadline_days integer DEFAULT 14,
    p_penalty_xp    integer DEFAULT 100
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_count integer;
BEGIN
    WITH expired AS (
        UPDATE tool_requests
        SET    status      = 'open',
               claimed_by  = NULL,
               claimed_at  = NULL,
               bonus_xp    = COALESCE(bonus_xp, 0) + p_penalty_xp
        WHERE  status = 'claimed'
          AND  claimed_at IS NOT NULL
          AND  claimed_at < (NOW() - (p_deadline_days || ' days')::interval)
        RETURNING claimed_by
    ),
    penalty AS (
        SELECT claimed_by AS user_id, COUNT(*)::integer AS n
        FROM   expired
        WHERE  claimed_by IS NOT NULL
        GROUP  BY claimed_by
    )
    UPDATE profiles p
    SET    total_xp = GREATEST(0, p.total_xp - (penalty.n * p_penalty_xp))
    FROM   penalty
    WHERE  p.id = penalty.user_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ============================================
-- DONE!
-- ============================================
