CREATE TABLE IF NOT EXISTS prompt_settings (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE prompt_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on prompt_settings"
  ON prompt_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anon insert on prompt_settings"
  ON prompt_settings FOR INSERT TO anon, authenticated
  WITH CHECK (key IS NOT NULL AND key <> '' AND value IS NOT NULL);

CREATE POLICY "Allow anon update on prompt_settings"
  ON prompt_settings FOR UPDATE TO anon, authenticated
  USING  (key IS NOT NULL)
  WITH CHECK (key IS NOT NULL AND value IS NOT NULL);

CREATE POLICY "Allow anon delete on prompt_settings"
  ON prompt_settings FOR DELETE TO anon, authenticated
  USING (key IS NOT NULL);
