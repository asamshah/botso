-- Add completed_todos column to entries table to store which todos are checked
ALTER TABLE entries ADD COLUMN IF NOT EXISTS completed_todos TEXT DEFAULT NULL;
