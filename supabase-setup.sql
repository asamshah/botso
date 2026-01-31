-- ============================================
-- BOTSO MULTI-USER SETUP
-- Run these commands in your Supabase SQL Editor
-- ============================================

-- 1. CREATE WAITLIST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow anonymous inserts to waitlist (for landing page)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

-- Prevent reading waitlist (admin only via dashboard)
CREATE POLICY "No public read on waitlist" ON waitlist
  FOR SELECT USING (false);


-- 2. ADD USER_ID TO ENTRIES TABLE
-- ============================================
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);


-- 3. ADD USER_ID TO PROFILES TABLE
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add unique constraint so each user has one profile
ALTER TABLE profiles
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);


-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on entries
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (uncomment if needed)
-- DROP POLICY IF EXISTS "Users can view own entries" ON entries;
-- DROP POLICY IF EXISTS "Users can insert own entries" ON entries;
-- DROP POLICY IF EXISTS "Users can update own entries" ON entries;
-- DROP POLICY IF EXISTS "Users can delete own entries" ON entries;

-- Create policies for entries
CREATE POLICY "Users can view own entries" ON entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON entries
  FOR DELETE USING (auth.uid() = user_id);


-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (uncomment if needed)
-- DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);


-- 5. STORAGE BUCKET POLICIES
-- ============================================
-- Update storage policies for avatars bucket

-- First, ensure the bucket exists and is public for reads
-- (Do this in the Supabase Dashboard > Storage > Create bucket "avatars")

-- Policy: Users can upload their own avatars
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Anyone can view avatars (public)
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL
  );


-- Similar policies for memento bucket (entry attachments)
CREATE POLICY "Users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'memento' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Attachments are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'memento');

CREATE POLICY "Users can delete own attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'memento' AND
    auth.uid() IS NOT NULL
  );


-- 6. HELPER FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, bio)
  VALUES (NEW.id, 'Your Name', 'Your bio here');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- GOOGLE AUTH SETUP (do in Supabase Dashboard)
-- ============================================
-- 1. Go to Authentication > Providers > Google
-- 2. Enable Google provider
-- 3. Add your Google OAuth credentials:
--    - Client ID
--    - Client Secret
-- 4. Get these from: https://console.cloud.google.com/apis/credentials
-- 5. Set authorized redirect URI in Google Console:
--    https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
