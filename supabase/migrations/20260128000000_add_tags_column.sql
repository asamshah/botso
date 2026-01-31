-- Add tags column to entries table
-- Run this in your Supabase SQL Editor

ALTER TABLE entries
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT NULL;

-- Create an index for better tag searching performance
CREATE INDEX IF NOT EXISTS idx_entries_tags ON entries USING GIN (tags);
