-- QUICK SETUP: Copy this entire file and paste into Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/vwlnnocosqsureltloqi/editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Files metadata table
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  r2_bucket TEXT NOT NULL DEFAULT 'fmap-waypoints',
  display_name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  brand TEXT NOT NULL CHECK (brand IN ('lowrance', 'garmin', 'humminbird', 'raymarine', 'simrad', 'furuno', 'other')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 524288000)
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public files" ON public.files FOR SELECT USING (is_public = true AND is_deleted = false);
CREATE POLICY "Users can view own files" ON public.files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can upload files" ON public.files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own files" ON public.files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own files" ON public.files FOR DELETE USING (auth.uid() = user_id);

-- Downloads tracking
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own downloads" ON public.downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert download records" ON public.downloads FOR INSERT WITH CHECK (true);

-- Rate limiting
CREATE TABLE IF NOT EXISTS public.upload_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.upload_rate_limits ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_brand ON public.files(brand);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON public.files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_file_id ON public.downloads(file_id);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.files TO anon;
GRANT SELECT ON public.user_profiles TO anon;
