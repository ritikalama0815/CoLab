-- Run in Supabase SQL Editor after initial schema (RUN_THIS.sql).
-- Docs activity: self-reported Google Docs/Slides/Sheets work per student for fair reporting.

CREATE TABLE IF NOT EXISTS public.docs_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_url TEXT,
  doc_kind TEXT DEFAULT 'docs' CHECK (doc_kind IN ('docs', 'slides', 'sheets', 'other')),
  minutes_spent INTEGER DEFAULT 0 CHECK (minutes_spent >= 0),
  lines_added INTEGER DEFAULT 0 CHECK (lines_added >= 0),
  lines_removed INTEGER DEFAULT 0 CHECK (lines_removed >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_activity_group ON public.docs_activity(group_id);
CREATE INDEX IF NOT EXISTS idx_docs_activity_user ON public.docs_activity(user_id);

ALTER TABLE public.docs_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view docs activity"
  ON public.docs_activity FOR SELECT
  USING (
    public.is_group_member(group_id)
    OR public.is_group_project_owner(group_id)
  );

CREATE POLICY "Group members log own docs activity"
  ON public.docs_activity FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_group_member(group_id)
  );

CREATE POLICY "Users update own docs activity"
  ON public.docs_activity FOR UPDATE
  USING (auth.uid() = user_id AND public.is_group_member(group_id));

CREATE POLICY "Users delete own docs activity"
  ON public.docs_activity FOR DELETE
  USING (auth.uid() = user_id AND public.is_group_member(group_id));

-- Storage for submission file uploads (create bucket if missing)
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-files', 'submission-files', true)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {user_id}/{group_id}/{filename}
-- If policies already exist, drop them first or ignore duplicate errors.
DROP POLICY IF EXISTS "submission-files insert own prefix" ON storage.objects;
DROP POLICY IF EXISTS "submission-files read" ON storage.objects;
DROP POLICY IF EXISTS "submission-files delete own" ON storage.objects;

CREATE POLICY "submission-files insert own prefix"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'submission-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "submission-files read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'submission-files');

CREATE POLICY "submission-files delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'submission-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
