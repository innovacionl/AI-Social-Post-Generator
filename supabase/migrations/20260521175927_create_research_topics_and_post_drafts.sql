/*
  # Create research_topics and post_drafts tables

  1. New Tables
    - `research_topics`
      - `id` (uuid, primary key, auto-generated)
      - `question` (text, the research question)
      - `career` (text, user's career/role)
      - `industry` (text, user's industry)
      - `status` (text, default 'Pending' - values: Pending, In Progress, Complete)
      - `findings` (jsonb, nullable - stores research findings with sources/citations)
      - `created_at` (timestamptz, auto-generated)
    - `post_drafts`
      - `id` (uuid, primary key, auto-generated)
      - `research_topic_id` (uuid, foreign key to research_topics, nullable)
      - `platform` (text - 'twitter' or 'linkedin')
      - `tone` (text, default 'inspirational')
      - `content` (text, the draft post content)
      - `created_at` (timestamptz, auto-generated)

  2. Security
    - Enable RLS on both tables
    - Add policies for anon role to perform all CRUD operations (no auth required for this app)
*/

-- Create research_topics table
CREATE TABLE IF NOT EXISTS research_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  career text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending',
  findings jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE research_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on research_topics"
  ON research_topics FOR SELECT
  TO anon
  USING (status IS NOT NULL);

CREATE POLICY "Allow anon insert on research_topics"
  ON research_topics FOR INSERT
  TO anon
  WITH CHECK (question IS NOT NULL AND question != '');

CREATE POLICY "Allow anon update on research_topics"
  ON research_topics FOR UPDATE
  TO anon
  USING (status IS NOT NULL)
  WITH CHECK (question IS NOT NULL AND question != '');

CREATE POLICY "Allow anon delete on research_topics"
  ON research_topics FOR DELETE
  TO anon
  USING (status IS NOT NULL);

-- Create post_drafts table
CREATE TABLE IF NOT EXISTS post_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_topic_id uuid REFERENCES research_topics(id) ON DELETE SET NULL,
  platform text NOT NULL DEFAULT 'twitter',
  tone text NOT NULL DEFAULT 'inspirational',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on post_drafts"
  ON post_drafts FOR SELECT
  TO anon
  USING (content IS NOT NULL);

CREATE POLICY "Allow anon insert on post_drafts"
  ON post_drafts FOR INSERT
  TO anon
  WITH CHECK (platform IN ('twitter', 'linkedin'));

CREATE POLICY "Allow anon update on post_drafts"
  ON post_drafts FOR UPDATE
  TO anon
  USING (content IS NOT NULL)
  WITH CHECK (platform IN ('twitter', 'linkedin'));

CREATE POLICY "Allow anon delete on post_drafts"
  ON post_drafts FOR DELETE
  TO anon
  USING (content IS NOT NULL);