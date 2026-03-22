-- Enable Supabase Realtime for the messages table
-- Run this in Supabase SQL Editor

-- Add the messages table to the supabase_realtime publication
-- (This is required for postgres_changes subscriptions to work)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
