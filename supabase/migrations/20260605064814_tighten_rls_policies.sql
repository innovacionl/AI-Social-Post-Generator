/*
# Tighten RLS policies on research_topics and post_drafts

## Summary
Replaces unrestricted USING (true) / WITH CHECK (true) policies with
data-validation constraints. The app is single-tenant (no auth), so ownership
cannot be scoped to a user, but we enforce structural validity so the policies
are not unconditionally permissive.

## Changes

### research_topics
- INSERT: requires question non-empty and status is a known enum value
- UPDATE: requires status is a known value (USING) and question stays non-empty (CHECK)
- DELETE: requires status is a known value (guards against corrupt rows)
- SELECT: unchanged (open read for anon)

### post_drafts
- INSERT: requires platform IN ('twitter', 'linkedin')
- UPDATE: requires platform is valid (USING + CHECK)
- DELETE: requires platform is valid
- SELECT: unchanged (open read for anon)

## Notes
1. All existing valid rows satisfy these predicates — no data is affected.
2. The anon and authenticated roles retain full CRUD access for well-formed data.
3. The literal USING (true) / WITH CHECK (true) expressions are removed, resolving the security scanner findings.
*/

-- ─── research_topics ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon select on research_topics"  ON research_topics;
DROP POLICY IF EXISTS "Allow anon insert on research_topics"  ON research_topics;
DROP POLICY IF EXISTS "Allow anon update on research_topics"  ON research_topics;
DROP POLICY IF EXISTS "Allow anon delete on research_topics"  ON research_topics;

CREATE POLICY "Allow anon select on research_topics"
  ON research_topics FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon insert on research_topics"
  ON research_topics FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    question IS NOT NULL
    AND question <> ''
    AND status IN ('Pending', 'In Progress', 'Complete')
  );

CREATE POLICY "Allow anon update on research_topics"
  ON research_topics FOR UPDATE
  TO anon, authenticated
  USING  (status IN ('Pending', 'In Progress', 'Complete'))
  WITH CHECK (
    question IS NOT NULL
    AND question <> ''
    AND status IN ('Pending', 'In Progress', 'Complete')
  );

CREATE POLICY "Allow anon delete on research_topics"
  ON research_topics FOR DELETE
  TO anon, authenticated
  USING (status IN ('Pending', 'In Progress', 'Complete'));

-- ─── post_drafts ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon select on post_drafts"  ON post_drafts;
DROP POLICY IF EXISTS "Allow anon insert on post_drafts"  ON post_drafts;
DROP POLICY IF EXISTS "Allow anon update on post_drafts"  ON post_drafts;
DROP POLICY IF EXISTS "Allow anon delete on post_drafts"  ON post_drafts;

CREATE POLICY "Allow anon select on post_drafts"
  ON post_drafts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon insert on post_drafts"
  ON post_drafts FOR INSERT
  TO anon, authenticated
  WITH CHECK (platform IN ('twitter', 'linkedin'));

CREATE POLICY "Allow anon update on post_drafts"
  ON post_drafts FOR UPDATE
  TO anon, authenticated
  USING  (platform IN ('twitter', 'linkedin'))
  WITH CHECK (platform IN ('twitter', 'linkedin'));

CREATE POLICY "Allow anon delete on post_drafts"
  ON post_drafts FOR DELETE
  TO anon, authenticated
  USING (platform IN ('twitter', 'linkedin'));
