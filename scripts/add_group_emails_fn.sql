-- Allows any group member to fetch all emails in their group.
-- SECURITY DEFINER bypasses RLS so students can see each other's emails.
-- Run this in Supabase SQL Editor.

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
