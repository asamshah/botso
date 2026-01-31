-- Add is_reminder column to entries table
ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_reminder BOOLEAN DEFAULT FALSE;

-- Create index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_entries_is_reminder ON entries (is_reminder) WHERE is_reminder = true;
