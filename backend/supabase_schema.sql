-- ==============================================================================
-- TRUTHLENS AI — SUPABASE POSTGRESQL DATABASE SCHEMA
-- ==============================================================================
-- Execute this SQL in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create Profiles table (mirrors auth.users with public profile attributes)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Trigger: automatically sync new Supabase Auth signups into public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar, created_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar',
    COALESCE(new.created_at, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE public.profiles.name END,
    avatar = COALESCE(EXCLUDED.avatar, public.profiles.avatar);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create Analyses Table
CREATE TABLE IF NOT EXISTS public.analyses (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    input_type VARCHAR(20) DEFAULT 'text',
    title TEXT,
    source_url TEXT,
    raw_content TEXT NOT NULL,
    verdict VARCHAR(20) NOT NULL,
    confidence INTEGER NOT NULL,
    summary TEXT NOT NULL,
    claims JSONB DEFAULT '[]'::jsonb,
    metrics JSONB DEFAULT '[]'::jsonb,
    metadata_info JSONB DEFAULT '{}'::jsonb,
    is_bookmarked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_analyses_verdict ON public.analyses(verdict);

-- 4. Create Real Articles Table
CREATE TABLE IF NOT EXISTS public.real_articles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    analysis_id INTEGER REFERENCES public.analyses(id) ON DELETE SET NULL,
    input_type VARCHAR(20) DEFAULT 'text',
    original_title TEXT NOT NULL,
    original_claim TEXT NOT NULL,
    original_verdict VARCHAR(20) NOT NULL,
    confidence INTEGER DEFAULT 80,
    what_was_wrong TEXT NOT NULL,
    what_actually_happened TEXT NOT NULL,
    verified_source_name TEXT NOT NULL,
    verified_source_url TEXT,
    sources JSONB DEFAULT '[]'::jsonb,
    claims_breakdown JSONB DEFAULT '[]'::jsonb,
    content_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_real_articles_user_id ON public.real_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_real_articles_analysis_id ON public.real_articles(analysis_id);
CREATE INDEX IF NOT EXISTS idx_real_articles_content_hash ON public.real_articles(content_hash);

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_articles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own profile and edit it
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Analyses: Authenticated users can manage their own scans; anonymous scans readable by owner session
CREATE POLICY "Users can view own analyses" ON public.analyses
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert analyses" ON public.analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own analyses" ON public.analyses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses" ON public.analyses
    FOR DELETE USING (auth.uid() = user_id);

-- Real Articles: Users can view their own real article entries
CREATE POLICY "Users can view own real articles" ON public.real_articles
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert real articles" ON public.real_articles
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
