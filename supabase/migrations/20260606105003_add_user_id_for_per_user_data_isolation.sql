/*
# Add user_id to all tables for per-user data isolation

## Summary
Converts the app from single-tenant (shared data) to multi-user (each user owns their own data).
Every user now starts with a clean slate — no data from other users is visible.

## Changes

### research_topics
- Added `user_id uuid DEFAULT auth.uid()` — automatically filled from the authenticated session on INSERT.
- Replaced unrestricted anon/authenticated policies with owner-scoped authenticated-only policies.
- Existing rows (user_id IS NULL) are no longer reachable by any user query.

### post_drafts
- Added `user_id uuid DEFAULT auth.uid()`.
- Replaced unrestricted policies with owner-scoped authenticated-only policies.
- Existing rows (user_id IS NULL) are no longer reachable.

### prompt_settings
- Cleared existing single-tenant data (intentional — every user starts clean).
- Dropped old primary key on `key`.
- Added `user_id uuid NOT NULL DEFAULT auth.uid()`.
- New composite primary key `(user_id, key)` — each user has their own prompt settings keyed by name.
- Replaced unrestricted policies with owner-scoped authenticated-only policies.

## Security
- All tables now use `auth.uid() = user_id` predicates.
- Only `authenticated` role can read/write. Unauthenticated (anon) requests are rejected.
- INSERT policies use DEFAULT auth.uid() so the frontend never needs to supply user_id explicitly.

## Important Notes
1. The DEFAULT auth.uid() on the user_id column means .insert({ title }) works — user_id is filled automatically.
2. Existing rows with NULL user_id are inaccessible (no authenticated user has uid() = null).
3. prompt_settings data is cleared intentionally; each user will save their own settings fresh.
4. Edge functions must now pass the user JWT (not anon key) to read per-user prompt_settings.
*/

-- ─── research_topics ─────────────────────────────────────────────────────────

ALTER TABLE research_topics
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow anon select on research_topics"  ON research_topics;
DROP POLICY IF EXISTS "Allow anon insert on research_topics"  ON research_topics;
DROP POLICY IF EXISTS "Allow anon update on research_topics"  ON research_topics;
DROP POLICY IF EXISTS "Allow anon delete on research_topics"  ON research_topics;

CREATE POLICY "select_own_research_topics" ON research_topics
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_research_topics" ON research_topics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_research_topics" ON research_topics
  FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_research_topics" ON research_topics
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── post_drafts ──────────────────────────────────────────────────────────────

ALTER TABLE post_drafts
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow anon select on post_drafts"  ON post_drafts;
DROP POLICY IF EXISTS "Allow anon insert on post_drafts"  ON post_drafts;
DROP POLICY IF EXISTS "Allow anon update on post_drafts"  ON post_drafts;
DROP POLICY IF EXISTS "Allow anon delete on post_drafts"  ON post_drafts;

CREATE POLICY "select_own_post_drafts" ON post_drafts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_post_drafts" ON post_drafts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_post_drafts" ON post_drafts
  FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_post_drafts" ON post_drafts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─── prompt_settings ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon select on prompt_settings"  ON prompt_settings;
DROP POLICY IF EXISTS "Allow anon insert on prompt_settings"  ON prompt_settings;
DROP POLICY IF EXISTS "Allow anon update on prompt_settings"  ON prompt_settings;
DROP POLICY IF EXISTS "Allow anon delete on prompt_settings"  ON prompt_settings;

-- Clear existing single-tenant data before changing the primary key
DELETE FROM prompt_settings;

-- Drop old single-column primary key
ALTER TABLE prompt_settings DROP CONSTRAINT IF EXISTS prompt_settings_pkey;

-- Add user_id (safe: no rows exist after DELETE above)
ALTER TABLE prompt_settings
  ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid();

-- Composite primary key: one set of settings per (user, key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prompt_settings_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE prompt_settings ADD PRIMARY KEY (user_id, key);
  END IF;
END $$;

CREATE POLICY "select_own_prompt_settings" ON prompt_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_prompt_settings" ON prompt_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_prompt_settings" ON prompt_settings
  FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_prompt_settings" ON prompt_settings
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
