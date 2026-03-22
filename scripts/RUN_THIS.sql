-- ============================================================================
-- FairGroup — THE ONLY SQL FILE YOU NEED TO RUN
-- Paste this entire file into Supabase SQL Editor and click "Run"
-- It drops everything and recreates from scratch. Safe to re-run.
-- ============================================================================

-- Drop everything in reverse dependency order
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.contribution_scores CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.docs_activity CASCADE;
DROP TABLE IF EXISTS public.commits CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.project_groups CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.profile_id_for_invite_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.is_project_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_project_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_group_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_group_project_owner(uuid) CASCADE;

-- ============================================================================
-- PROFILES
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  github_username TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'instructor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROJECTS (top-level, created by instructor)
-- ============================================================================

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROJECT_GROUPS (sub-groups A, B, C within a project)
-- ============================================================================

CREATE TABLE public.project_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Group A',
  github_repo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MEMBERSHIPS (user belongs to a project AND is assigned to a sub-group)
-- ============================================================================

CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.project_groups(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- ============================================================================
-- MESSAGES (group chat)
-- ============================================================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RESOURCES (shared links / workpages)
-- ============================================================================

CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  resource_type TEXT DEFAULT 'link' CHECK (resource_type IN ('link', 'document', 'repo', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUBMISSIONS (file + link submissions from students)
-- ============================================================================

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,
  link_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QUESTIONS (student asks instructor)
-- ============================================================================

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  asked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMMITS (GitHub sync, per sub-group)
-- ============================================================================

CREATE TABLE public.commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sha TEXT NOT NULL,
  message TEXT,
  github_username TEXT,
  author_github_username TEXT,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, sha)
);

-- ============================================================================
-- CONTRIBUTION_SCORES (per sub-group per user)
-- ============================================================================

CREATE TABLE public.contribution_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC(5,2) DEFAULT 0,
  github_commits INTEGER DEFAULT 0,
  github_additions INTEGER DEFAULT 0,
  github_deletions INTEGER DEFAULT 0,
  github_score NUMERIC(5,2) DEFAULT 0,
  docs_score NUMERIC(5,2) DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  ai_summary TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================================================
-- REPORTS (AI analysis / full reports, per sub-group)
-- ============================================================================

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind TEXT DEFAULT 'full_report' CHECK (kind IN ('ai_analysis', 'full_report')),
  summary TEXT,
  detailed_analysis JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ── SECURITY DEFINER helpers (bypass RLS to break circular dependencies) ──

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id AND created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_project_owner(p_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_groups pg
    JOIN public.projects p ON p.id = pg.project_id
    WHERE pg.id = p_group_id AND p.created_by = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_project_owner(uuid) TO authenticated;

-- ── Profiles ──

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Instructors can view all profiles" ON public.profiles
  FOR SELECT USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'app_role'),
      ''
    ) = 'instructor'
  );

-- ── Projects ──

CREATE POLICY "Members can view their projects" ON public.projects
  FOR SELECT USING (
    created_by = auth.uid()
    OR public.is_project_member(id)
  );
CREATE POLICY "Instructors can create projects" ON public.projects
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'app_role') = 'instructor'
  );
CREATE POLICY "Project owner can update" ON public.projects
  FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Project owner can delete" ON public.projects
  FOR DELETE USING (created_by = auth.uid());

-- ── Project Groups ──

CREATE POLICY "Members can view groups in their project" ON public.project_groups
  FOR SELECT USING (
    public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  );
CREATE POLICY "Project owner can manage groups" ON public.project_groups
  FOR INSERT WITH CHECK (
    public.is_project_owner(project_id)
  );
CREATE POLICY "Project owner can update groups" ON public.project_groups
  FOR UPDATE USING (
    public.is_project_owner(project_id)
  );
CREATE POLICY "Project owner can delete groups" ON public.project_groups
  FOR DELETE USING (
    public.is_project_owner(project_id)
  );

-- ── Memberships ──

CREATE POLICY "Users can view memberships in their projects" ON public.memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_project_owner(project_id)
  );
CREATE POLICY "Project owner can add members" ON public.memberships
  FOR INSERT WITH CHECK (
    public.is_project_owner(project_id)
    OR user_id = auth.uid()
  );
CREATE POLICY "Project owner can update members" ON public.memberships
  FOR UPDATE USING (
    public.is_project_owner(project_id)
  );
CREATE POLICY "Project owner can remove members" ON public.memberships
  FOR DELETE USING (
    public.is_project_owner(project_id)
    OR user_id = auth.uid()
  );

-- ── Messages ──

CREATE POLICY "Group members can view messages" ON public.messages
  FOR SELECT USING (
    public.is_group_member(group_id)
  );
CREATE POLICY "Group members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_group_member(group_id)
  );

-- ── Resources ──

CREATE POLICY "Group members can view resources" ON public.resources
  FOR SELECT USING (
    public.is_group_member(group_id)
    OR public.is_group_project_owner(group_id)
  );
CREATE POLICY "Group members can add resources" ON public.resources
  FOR INSERT WITH CHECK (
    auth.uid() = added_by
    AND public.is_group_member(group_id)
  );
CREATE POLICY "Resource owner can delete" ON public.resources
  FOR DELETE USING (added_by = auth.uid());

-- ── Submissions ──

CREATE POLICY "Group members and owner can view submissions" ON public.submissions
  FOR SELECT USING (
    public.is_group_member(group_id)
    OR public.is_group_project_owner(group_id)
  );
CREATE POLICY "Group members can submit" ON public.submissions
  FOR INSERT WITH CHECK (
    auth.uid() = submitted_by
    AND public.is_group_member(group_id)
  );

-- ── Questions ──

CREATE POLICY "Group members and owner can view questions" ON public.questions
  FOR SELECT USING (
    public.is_group_member(group_id)
    OR public.is_group_project_owner(group_id)
  );
CREATE POLICY "Group members can ask questions" ON public.questions
  FOR INSERT WITH CHECK (
    auth.uid() = asked_by
    AND public.is_group_member(group_id)
  );
CREATE POLICY "Project owner can answer questions" ON public.questions
  FOR UPDATE USING (
    public.is_group_project_owner(group_id)
  );

-- ── Commits ──

CREATE POLICY "Group members can view commits" ON public.commits
  FOR SELECT USING (
    public.is_group_member(group_id)
    OR public.is_group_project_owner(group_id)
  );
CREATE POLICY "Authenticated can insert commits" ON public.commits
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── Contribution Scores ──

CREATE POLICY "Group members can view scores" ON public.contribution_scores
  FOR SELECT USING (
    public.is_group_member(group_id)
    OR public.is_group_project_owner(group_id)
  );
CREATE POLICY "Authenticated can upsert scores" ON public.contribution_scores
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update scores" ON public.contribution_scores
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ── Reports ──

CREATE POLICY "Project owner can view reports" ON public.reports
  FOR SELECT USING (
    public.is_group_project_owner(group_id)
  );
CREATE POLICY "Project owner can create reports" ON public.reports
  FOR INSERT WITH CHECK (
    public.is_group_project_owner(group_id)
  );

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_project ON public.memberships(project_id);
CREATE INDEX idx_memberships_group ON public.memberships(group_id);
CREATE INDEX idx_project_groups_project ON public.project_groups(project_id);
CREATE INDEX idx_messages_group ON public.messages(group_id);
CREATE INDEX idx_resources_group ON public.resources(group_id);
CREATE INDEX idx_submissions_group ON public.submissions(group_id);
CREATE INDEX idx_questions_group ON public.questions(group_id);
CREATE INDEX idx_commits_group ON public.commits(group_id);
CREATE INDEX idx_commits_author ON public.commits(author_id);

-- ============================================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, github_username, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'user_name', NULL),
    CASE
      WHEN (NEW.raw_user_meta_data ->> 'app_role') IN ('student', 'instructor')
      THEN (NEW.raw_user_meta_data ->> 'app_role')
      ELSE 'student'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    github_username = COALESCE(EXCLUDED.github_username, profiles.github_username),
    role = COALESCE(
      NULLIF(
        CASE
          WHEN (NEW.raw_user_meta_data ->> 'app_role') IN ('student', 'instructor')
          THEN (NEW.raw_user_meta_data ->> 'app_role')
          ELSE NULL
        END, ''
      ),
      profiles.role
    ),
    updated_at = NOW();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user trigger failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- HELPER: email lookup
-- ============================================================================

CREATE FUNCTION public.profile_id_for_invite_email(lookup text)
RETURNS TABLE (out_id uuid, out_role text, out_email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.role::text, p.email
  FROM public.profiles p
  WHERE p.email IS NOT NULL AND lower(trim(p.email)) = lower(trim(lookup))
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.profile_id_for_invite_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_id_for_invite_email(text) TO authenticated;

-- ============================================================================
-- HELPER: group member emails (bypasses RLS so students can see each other)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_group_member_emails(p_group_id uuid)
RETURNS TABLE (user_id uuid, email text, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.user_id, p.email, p.full_name
  FROM public.memberships m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.group_id = p_group_id
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE group_id = p_group_id AND user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_group_member_emails(uuid) TO authenticated;

-- ============================================================================
-- TODOS (AI-generated and manual task lists per group)
-- ============================================================================

CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.project_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  phase TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  color TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todos_group ON public.todos(group_id);
CREATE INDEX idx_todos_assigned ON public.todos(assigned_to);

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view todos" ON public.todos
  FOR SELECT USING (
    public.is_group_member(group_id)
    OR public.is_group_project_owner(group_id)
  );

CREATE POLICY "Group members can create todos" ON public.todos
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND public.is_group_member(group_id)
  );

CREATE POLICY "Group members can update todos" ON public.todos
  FOR UPDATE USING (
    public.is_group_member(group_id)
  );

CREATE POLICY "Group members can delete todos" ON public.todos
  FOR DELETE USING (
    public.is_group_member(group_id)
  );

-- ============================================================================
-- SEED: teacher account
-- ============================================================================

INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'fedb7efa-9d5a-4069-8e0c-8c0e86c1dc49',
  'bhattaraisalin10@gmail.com',
  'Shalin Bhattarai',
  'instructor'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'instructor',
  full_name = 'Shalin Bhattarai',
  email = 'bhattaraisalin10@gmail.com',
  updated_at = NOW();
