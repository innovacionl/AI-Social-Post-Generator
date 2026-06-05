/*
# Create research_topics and post_drafts tables

## Summary
Sets up the full schema for a LinkedIn/Twitter post-generation app that:
1. Lets users submit research questions (with career/industry context)
2. Tracks async research jobs (Pending → In Progress → Complete)
3. Stores AI-generated post drafts tied to research findings
4. Tracks which drafts have been published

## New Tables

### research_topics
Stores a research question and its async-research lifecycle.
- `id` — uuid primary key
- `question` — the research question (required)
- `career` — user's career/role (optional context)
- `industry` — user's industry (optional context)
- `status` — lifecycle state: Pending | In Progress | Complete
- `findings` — jsonb blob with `{ summary, sources: [{title, url}] }`
- `gemini_interaction_id` — external AI interaction ID for polling/tracking
- `created_at` — row creation timestamp

### post_drafts
Stores AI-generated post drafts and their publish state.
- `id` — uuid primary key
- `research_topic_id` — nullable FK to research_topics (SET NULL on delete)
- `platform` — 'twitter' or 'linkedin'
- `tone` — e.g. 'inspirational', 'professional', etc.
- `content` — draft post text
- `posted_at` — nullable; set when the user marks the draft as published
- `created_at` — row creation timestamp

## Security
- RLS enabled on both tables.
- Four separate policies per table (SELECT / INSERT / UPDATE / DELETE) for the `anon` role.
  USING (true) is intentional: this is a single-tenant app with no user accounts.
*/

-- ─── research_topics ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS research_topics (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question              text        NOT NULL,
  career                text        NOT NULL DEFAULT '',
  industry              text        NOT NULL DEFAULT '',
  status                text        NOT NULL DEFAULT 'Pending',
  findings              jsonb,
  gemini_interaction_id text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE research_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select on research_topics"  ON research_topics;
DROP POLICY IF EXISTS "Allow anon insert on research_topics"  ON research_topics;
DROP POLICY IF EXISTS "Allow anon update on research_topics"  ON research_topics;
DROP POLICY IF EXISTS "Allow anon delete on research_topics"  ON research_topics;

CREATE POLICY "Allow anon select on research_topics"
  ON research_topics FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anon insert on research_topics"
  ON research_topics FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anon update on research_topics"
  ON research_topics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete on research_topics"
  ON research_topics FOR DELETE TO anon, authenticated USING (true);

-- ─── post_drafts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS post_drafts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  research_topic_id   uuid        REFERENCES research_topics(id) ON DELETE SET NULL,
  platform            text        NOT NULL DEFAULT 'twitter',
  tone                text        NOT NULL DEFAULT 'inspirational',
  content             text        NOT NULL DEFAULT '',
  posted_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select on post_drafts"  ON post_drafts;
DROP POLICY IF EXISTS "Allow anon insert on post_drafts"  ON post_drafts;
DROP POLICY IF EXISTS "Allow anon update on post_drafts"  ON post_drafts;
DROP POLICY IF EXISTS "Allow anon delete on post_drafts"  ON post_drafts;

CREATE POLICY "Allow anon select on post_drafts"
  ON post_drafts FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anon insert on post_drafts"
  ON post_drafts FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anon update on post_drafts"
  ON post_drafts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete on post_drafts"
  ON post_drafts FOR DELETE TO anon, authenticated USING (true);
