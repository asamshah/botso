-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Your Name',
  bio TEXT DEFAULT 'Your bio here',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (single-user app)
CREATE POLICY "Allow all operations on profiles" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for avatars bucket
CREATE POLICY "Allow public read access to avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow all uploads to avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow all updates to avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Allow all deletes from avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars');
