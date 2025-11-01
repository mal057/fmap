-- FishMap Database Schema for Supabase
-- This schema manages file metadata, user profiles, and download tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- This stores additional user profile information
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Files metadata table
-- Stores metadata for all uploaded fish finder files
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- File information
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- Size in bytes
  mime_type TEXT NOT NULL,
  file_extension TEXT NOT NULL,

  -- R2 storage information
  r2_key TEXT NOT NULL UNIQUE, -- R2 object key
  r2_bucket TEXT NOT NULL DEFAULT 'fmap-waypoints',

  -- User-provided metadata
  display_name TEXT NOT NULL,
  description TEXT,
  location TEXT, -- General location description (e.g., "Lake Michigan")

  -- Fish finder brand/type
  brand TEXT NOT NULL CHECK (brand IN (
    'lowrance', 'garmin', 'humminbird', 'raymarine', 'simrad', 'furuno', 'other'
  )),

  -- Owner and upload information
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Statistics
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Status
  is_public BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 524288000) -- Max 500MB
);

-- Enable Row Level Security
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Files policies
CREATE POLICY "Anyone can view public files"
  ON public.files FOR SELECT
  USING (is_public = true AND is_deleted = false);

CREATE POLICY "Users can view own files"
  ON public.files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can upload files"
  ON public.files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON public.files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON public.files FOR DELETE
  USING (auth.uid() = user_id);

-- Downloads tracking table
-- Tracks who downloaded what and when
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous downloads
  ip_address TEXT,
  user_agent TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate tracking within 1 hour
  UNIQUE(file_id, user_id, downloaded_at)
);

-- Enable Row Level Security
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Downloads policies
CREATE POLICY "Users can view own downloads"
  ON public.downloads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "File owners can view their file downloads"
  ON public.downloads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = downloads.file_id
      AND files.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert download records"
  ON public.downloads FOR INSERT
  WITH CHECK (true);

-- Upload rate limiting table
-- Tracks uploads per user for rate limiting
CREATE TABLE IF NOT EXISTS public.upload_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for efficient queries
  CONSTRAINT idx_user_upload_time UNIQUE (user_id, uploaded_at)
);

-- Enable Row Level Security
ALTER TABLE public.upload_rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limit policies
CREATE POLICY "Users can view own rate limits"
  ON public.upload_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert rate limit records"
  ON public.upload_rate_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_brand ON public.files(brand);
CREATE INDEX idx_files_uploaded_at ON public.files(uploaded_at DESC);
CREATE INDEX idx_files_is_public ON public.files(is_public) WHERE is_deleted = false;
CREATE INDEX idx_files_r2_key ON public.files(r2_key);

CREATE INDEX idx_downloads_file_id ON public.downloads(file_id);
CREATE INDEX idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX idx_downloads_downloaded_at ON public.downloads(downloaded_at DESC);

CREATE INDEX idx_upload_rate_limits_user_id ON public.upload_rate_limits(user_id);
CREATE INDEX idx_upload_rate_limits_time ON public.upload_rate_limits(uploaded_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.files
  SET download_count = download_count + 1
  WHERE id = NEW.file_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment download count
CREATE TRIGGER increment_file_download_count
  AFTER INSERT ON public.downloads
  FOR EACH ROW
  EXECUTE FUNCTION increment_download_count();

-- Function to clean up old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.upload_rate_limits
  WHERE uploaded_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limit (returns true if under limit)
CREATE OR REPLACE FUNCTION check_upload_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  upload_count INTEGER;
BEGIN
  -- Clean up old records first
  PERFORM cleanup_old_rate_limits();

  -- Count uploads in last hour
  SELECT COUNT(*)
  INTO upload_count
  FROM public.upload_rate_limits
  WHERE user_id = p_user_id
  AND uploaded_at > NOW() - INTERVAL '1 hour';

  -- Return true if under limit (10 per hour)
  RETURN upload_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant select on public data to anonymous users
GRANT SELECT ON public.files TO anon;
GRANT SELECT ON public.user_profiles TO anon;

-- Comments for documentation
COMMENT ON TABLE public.files IS 'Stores metadata for uploaded fish finder files';
COMMENT ON TABLE public.user_profiles IS 'Extended user profile information';
COMMENT ON TABLE public.downloads IS 'Tracks file download history';
COMMENT ON TABLE public.upload_rate_limits IS 'Rate limiting for file uploads (10 per hour per user)';

COMMENT ON COLUMN public.files.r2_key IS 'Cloudflare R2 object storage key';
COMMENT ON COLUMN public.files.brand IS 'Fish finder brand: lowrance, garmin, humminbird, etc.';
COMMENT ON COLUMN public.files.is_public IS 'Whether file is publicly accessible';
COMMENT ON COLUMN public.files.is_deleted IS 'Soft delete flag';
