-- ============================================================================
-- TODOS table + RLS + Realtime
-- Run this in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.todos (
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

CREATE INDEX IF NOT EXISTS idx_todos_group ON public.todos(group_id);
CREATE INDEX IF NOT EXISTS idx_todos_assigned ON public.todos(assigned_to);

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

-- Enable Realtime so the todo panel updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
