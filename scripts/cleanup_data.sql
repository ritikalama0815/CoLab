-- ============================================================================
-- CLEANUP: Remove all data from public tables (keeps schema + auth users intact)
-- Run this in Supabase SQL Editor.
-- ============================================================================

DELETE FROM public.reports;
DELETE FROM public.contribution_scores;
DELETE FROM public.commits;
DELETE FROM public.submissions;
DELETE FROM public.questions;
DELETE FROM public.resources;
DELETE FROM public.messages;
DELETE FROM public.memberships;
DELETE FROM public.project_groups;
DELETE FROM public.projects;
-- Keep profiles — they're tied to auth.users and recreated by the trigger
-- If you also want to wipe profiles (they'll be recreated on next login):
-- DELETE FROM public.profiles;
