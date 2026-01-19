-- =========================================================
-- AI Interview Assistant - FINAL DATABASE SCHEMA (UPDATED)
-- =========================================================
-- 
-- This is the COMPLETE schema for the AI Interview Assistant.
-- Run this SQL in your Supabase SQL Editor to set up the database.
-- 
-- WARNING: This will DROP ALL EXISTING TABLES and recreate them!
-- Backup any important data before running!
--
-- Tables created:
--   1. users              - User profiles (extends auth.users)
--   2. questions          - Master question pool (all questions)
--   3. interview_sessions - Groups attempts into sessions
--   4. attempts           - Individual answer attempts with scores
--   5. skill_progress     - Tracks skill improvement over time
--   6. question_history   - Tracks which questions user has seen
--   7. interview_reports  - Stored PDF report data
--   8. resume_analyses    - Stores resume analysis results
--   9. practice_sessions  - Tracks daily practice for streaks
--
-- Storage Buckets created:
--   1. audio-recordings   - For audio file storage (optional)
--   2. resumes            - For resume uploads
--
-- =========================================================

-- =========================================================
-- STEP 1: DROP ALL EXISTING OBJECTS
-- =========================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
DROP TRIGGER IF EXISTS trigger_update_skill_progress ON public.attempts;
DROP TRIGGER IF EXISTS trigger_update_question_history ON public.attempts;
DROP TRIGGER IF EXISTS trigger_update_user_stats ON public.attempts;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.interview_sessions;

-- Drop views
DROP VIEW IF EXISTS user_progress_overview CASCADE;
DROP VIEW IF EXISTS skill_breakdown CASCADE;
DROP VIEW IF EXISTS session_summary CASCADE;

-- Drop all tables (cascade removes constraints)
DROP TABLE IF EXISTS public.interview_reports CASCADE;
DROP TABLE IF EXISTS public.question_history CASCADE;
DROP TABLE IF EXISTS public.skill_progress CASCADE;
DROP TABLE IF EXISTS public.session_questions CASCADE;
DROP TABLE IF EXISTS public.attempts CASCADE;
DROP TABLE IF EXISTS public.interview_sessions CASCADE;
DROP TABLE IF EXISTS public.resume_analyses CASCADE;
DROP TABLE IF EXISTS public.practice_sessions CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.question_pool CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop storage policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can upload own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_skill_progress() CASCADE;
DROP FUNCTION IF EXISTS public.update_question_history() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats() CASCADE;

-- =========================================================
-- STEP 2: ENABLE EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- STEP 3: CREATE TABLES
-- =========================================================

-- ---------------------------------------------------------
-- 3a. USERS TABLE (extends auth.users)
-- ---------------------------------------------------------
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    
    -- User preferences
    preferences JSONB DEFAULT '{}',
    target_role TEXT,
    target_industry TEXT,
    experience_level TEXT CHECK (experience_level IN ('junior', 'mid', 'senior', 'lead')),
    
    -- Aggregated stats (updated by triggers/backend)
    total_attempts INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    best_score DECIMAL(5,2) DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 3b. QUESTIONS TABLE (Master Question Pool)
-- ---------------------------------------------------------
-- This is the ONLY questions table. All questions go here.
-- Custom uploaded questions have is_custom = TRUE
CREATE TABLE public.questions (
    id SERIAL PRIMARY KEY,
    
    -- Question content
    question TEXT NOT NULL,
    ideal_answer TEXT NOT NULL DEFAULT '',
    keywords TEXT[] DEFAULT '{}',
    
    -- Classification
    category TEXT NOT NULL DEFAULT 'behavioral',
    domain TEXT NOT NULL DEFAULT 'general',
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    
    -- Settings
    time_limit_seconds INTEGER DEFAULT 120,
    follow_up_questions TEXT[] DEFAULT '{}',
    
    -- Custom question tracking
    is_custom BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Usage stats (updated by triggers)
    times_asked INTEGER DEFAULT 0,
    avg_score_when_asked DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 3c. INTERVIEW SESSIONS TABLE
-- ---------------------------------------------------------
-- Groups multiple question attempts into one interview session
CREATE TABLE public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Session configuration
    domain TEXT NOT NULL DEFAULT 'general',
    job_description TEXT,
    job_title TEXT,
    session_name TEXT,
    difficulty_preference TEXT DEFAULT 'medium',
    
    -- Questions allocated to this session
    question_ids BIGINT[] DEFAULT NULL,
    
    -- Session progress
    total_questions INTEGER DEFAULT 0,
    completed_questions INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    
    -- JD analysis (stored for reference)
    jd_keywords TEXT[] DEFAULT '{}',
    jd_analysis JSONB DEFAULT '{}',
    
    -- Resume reference if uploaded
    resume_analysis_id UUID,
    
    -- Aggregated session scores (calculated when session completes)
    avg_content_score DECIMAL(5,2),
    avg_delivery_score DECIMAL(5,2),
    avg_communication_score DECIMAL(5,2),
    avg_voice_score DECIMAL(5,2),
    avg_confidence_score DECIMAL(5,2),
    avg_structure_score DECIMAL(5,2),
    avg_final_score DECIMAL(5,2),
    
    -- Session feedback (from LLM)
    consolidated_feedback JSONB,
    strengths TEXT[] DEFAULT '{}',
    improvements TEXT[] DEFAULT '{}',
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 3d. RESUME ANALYSES TABLE (NEW)
-- ---------------------------------------------------------
-- Stores resume analysis results for each upload
CREATE TABLE public.resume_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- File information
    file_name TEXT,
    file_url TEXT,
    file_size_bytes INTEGER,
    
    -- Extracted resume content
    resume_text TEXT,
    
    -- Job description used for analysis
    job_description TEXT,
    job_title TEXT,
    
    -- Analysis results
    skill_match_pct DECIMAL(5,2) DEFAULT 0,
    similarity_score DECIMAL(5,2) DEFAULT 0,
    overall_score DECIMAL(5,2) DEFAULT 0,
    
    -- Skills breakdown
    matched_skills TEXT[] DEFAULT '{}',
    missing_skills TEXT[] DEFAULT '{}',
    additional_skills TEXT[] DEFAULT '{}',
    
    -- Detailed analysis
    experience_analysis JSONB DEFAULT '{}',
    education_analysis JSONB DEFAULT '{}',
    keyword_analysis JSONB DEFAULT '{}',
    
    -- LLM feedback
    feedback JSONB DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    improvements TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    
    -- Domain detection
    detected_domain TEXT,
    detected_seniority TEXT,
    is_management_role BOOLEAN DEFAULT FALSE,
    
    -- Status
    status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint after resume_analyses is created
ALTER TABLE public.interview_sessions 
    ADD CONSTRAINT fk_resume_analysis 
    FOREIGN KEY (resume_analysis_id) 
    REFERENCES public.resume_analyses(id) ON DELETE SET NULL;

-- ---------------------------------------------------------
-- 3e. ATTEMPTS TABLE (Individual Question Answers)
-- ---------------------------------------------------------
-- Stores each answer attempt with full scores, transcript, and feedback
CREATE TABLE public.attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES public.questions(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
    
    -- Question snapshot (stored in case original question changes)
    question_text TEXT NOT NULL,
    ideal_answer TEXT DEFAULT '',
    
    -- User's answer
    transcript TEXT NOT NULL,
    audio_duration DECIMAL(10,2) DEFAULT 0,
    audio_file_url TEXT,
    
    -- 6-Score System (0-100 each)
    content_score DECIMAL(5,2) DEFAULT 0,
    delivery_score DECIMAL(5,2) DEFAULT 0,
    communication_score DECIMAL(5,2) DEFAULT 0,
    voice_score DECIMAL(5,2) DEFAULT 0,
    confidence_score DECIMAL(5,2) DEFAULT 0,
    structure_score DECIMAL(5,2) DEFAULT 0,
    final_score DECIMAL(5,2) DEFAULT 0,
    
    -- Domain and difficulty for filtering
    domain TEXT DEFAULT 'general',
    difficulty TEXT DEFAULT 'medium',
    
    -- LLM Feedback (stored as JSON)
    feedback TEXT,
    strengths TEXT[] DEFAULT '{}',
    improvements TEXT[] DEFAULT '{}',
    llm_feedback JSONB DEFAULT '{}',
    
    -- Voice Analysis (from librosa)
    voice_analysis JSONB DEFAULT '{}',
    
    -- Video Analysis (if applicable)
    video_analysis JSONB DEFAULT '{}',
    
    -- ML detailed scores
    ml_scores JSONB DEFAULT '{}',
    
    -- Legacy fields for compatibility
    wpm INTEGER DEFAULT 0,
    filler_count INTEGER DEFAULT 0,
    grammar_errors INTEGER DEFAULT 0,
    relevance DECIMAL(3,2) DEFAULT 0,
    keywords_found TEXT[] DEFAULT '{}',
    keywords_missing TEXT[] DEFAULT '{}',
    
    -- Order in session
    question_order INTEGER DEFAULT 0,
    
    -- Skip tracking
    is_skipped BOOLEAN DEFAULT FALSE,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 3f. SKILL PROGRESS TABLE
-- ---------------------------------------------------------
-- Tracks per-skill improvement over time for each user
CREATE TABLE public.skill_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Skill identifier
    skill_name TEXT NOT NULL CHECK (skill_name IN ('content', 'delivery', 'communication', 'voice', 'confidence', 'structure')),
    
    -- Current scores
    current_avg DECIMAL(5,2) DEFAULT 0,
    previous_avg DECIMAL(5,2) DEFAULT 0,
    best_score DECIMAL(5,2) DEFAULT 0,
    worst_score DECIMAL(5,2) DEFAULT 100,
    
    -- Trend tracking
    trend TEXT DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
    trend_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- History (for charts)
    score_history JSONB DEFAULT '[]',
    
    -- Stats
    attempts_count INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each user has one record per skill
    UNIQUE(user_id, skill_name)
);

-- ---------------------------------------------------------
-- 3g. QUESTION HISTORY TABLE
-- ---------------------------------------------------------
-- Tracks which questions each user has answered (for avoiding repeats)
CREATE TABLE public.question_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE,
    
    -- Attempt tracking
    times_asked INTEGER DEFAULT 1,
    last_asked_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Performance on this question
    best_score DECIMAL(5,2) DEFAULT 0,
    worst_score DECIMAL(5,2) DEFAULT 100,
    latest_score DECIMAL(5,2) DEFAULT 0,
    avg_score DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One record per user-question pair
    UNIQUE(user_id, question_id)
);

-- ---------------------------------------------------------
-- 3h. PRACTICE SESSIONS TABLE (NEW)
-- ---------------------------------------------------------
-- Tracks daily practice for streak calculation
CREATE TABLE public.practice_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Date of practice (only one per day per user)
    practice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Daily stats
    attempts_count INTEGER DEFAULT 1,
    average_score DECIMAL(5,2) DEFAULT 0,
    best_score DECIMAL(5,2) DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    
    -- Domains practiced
    domains_practiced TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One record per user per day
    UNIQUE(user_id, practice_date)
);

-- ---------------------------------------------------------
-- 3i. INTERVIEW REPORTS TABLE
-- ---------------------------------------------------------
-- Stores generated PDF reports
CREATE TABLE public.interview_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
    
    -- Report metadata
    report_type TEXT DEFAULT 'session' CHECK (report_type IN ('session', 'weekly', 'monthly', 'custom')),
    report_title TEXT,
    
    -- Full report content (for PDF generation)
    report_data JSONB NOT NULL DEFAULT '{}',
    
    -- File storage (if saved to Supabase Storage)
    pdf_file_url TEXT,
    file_size_bytes INTEGER,
    
    -- Status
    status TEXT DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- STEP 4: CREATE FUNCTIONS
-- =========================================================

-- Auto-create user profile when auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update skill progress after each attempt
CREATE OR REPLACE FUNCTION public.update_skill_progress()
RETURNS TRIGGER AS $$
DECLARE
    skill_rec RECORD;
BEGIN
    -- Skip if no user_id
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Update each skill
    FOR skill_rec IN 
        SELECT 
            unnest(ARRAY['content', 'delivery', 'communication', 'voice', 'confidence', 'structure']) as skill_name,
            unnest(ARRAY[NEW.content_score, NEW.delivery_score, NEW.communication_score, NEW.voice_score, NEW.confidence_score, NEW.structure_score]) as score_value
    LOOP
        INSERT INTO skill_progress (user_id, skill_name, current_avg, best_score, worst_score, attempts_count, last_practiced_at, score_history)
        VALUES (
            NEW.user_id, 
            skill_rec.skill_name, 
            skill_rec.score_value, 
            skill_rec.score_value,
            skill_rec.score_value,
            1, 
            NOW(),
            jsonb_build_array(jsonb_build_object('date', NOW(), 'score', skill_rec.score_value))
        )
        ON CONFLICT (user_id, skill_name) DO UPDATE SET
            previous_avg = skill_progress.current_avg,
            current_avg = ROUND(((skill_progress.current_avg * skill_progress.attempts_count + skill_rec.score_value) / (skill_progress.attempts_count + 1))::numeric, 2),
            best_score = GREATEST(skill_progress.best_score, skill_rec.score_value),
            worst_score = LEAST(skill_progress.worst_score, skill_rec.score_value),
            attempts_count = skill_progress.attempts_count + 1,
            last_practiced_at = NOW(),
            score_history = (
                CASE 
                    WHEN jsonb_array_length(skill_progress.score_history) >= 100 
                    THEN skill_progress.score_history - 0 
                    ELSE skill_progress.score_history 
                END
            ) || jsonb_build_object('date', NOW(), 'score', skill_rec.score_value),
            trend = CASE 
                WHEN skill_rec.score_value > skill_progress.current_avg + 2 THEN 'improving'
                WHEN skill_rec.score_value < skill_progress.current_avg - 2 THEN 'declining'
                ELSE 'stable'
            END,
            trend_percentage = ROUND((skill_rec.score_value - skill_progress.current_avg)::numeric, 2),
            updated_at = NOW();
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update question history after each attempt
CREATE OR REPLACE FUNCTION public.update_question_history()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL OR NEW.question_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO question_history (user_id, question_id, latest_score, best_score, worst_score, avg_score)
    VALUES (NEW.user_id, NEW.question_id, NEW.final_score, NEW.final_score, NEW.final_score, NEW.final_score)
    ON CONFLICT (user_id, question_id) DO UPDATE SET
        times_asked = question_history.times_asked + 1,
        latest_score = NEW.final_score,
        best_score = GREATEST(question_history.best_score, NEW.final_score),
        worst_score = LEAST(question_history.worst_score, NEW.final_score),
        avg_score = ROUND(((question_history.avg_score * question_history.times_asked + NEW.final_score) / (question_history.times_asked + 1))::numeric, 2),
        last_asked_at = NOW(),
        updated_at = NOW();

    -- Also update the questions table usage stats
    UPDATE questions SET 
        times_asked = times_asked + 1,
        avg_score_when_asked = ROUND(((COALESCE(avg_score_when_asked, 0) * times_asked + NEW.final_score) / (times_asked + 1))::numeric, 2)
    WHERE id = NEW.question_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update user stats after each attempt
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Update user's aggregate stats
    UPDATE users SET
        total_attempts = total_attempts + 1,
        average_score = ROUND(((average_score * total_attempts + NEW.final_score) / (total_attempts + 1))::numeric, 2),
        best_score = GREATEST(best_score, NEW.final_score),
        updated_at = NOW()
    WHERE id = NEW.user_id;

    -- Update or create practice session for today
    INSERT INTO practice_sessions (user_id, practice_date, attempts_count, average_score, best_score, total_duration_seconds, domains_practiced)
    VALUES (
        NEW.user_id,
        CURRENT_DATE,
        1,
        NEW.final_score,
        NEW.final_score,
        COALESCE(NEW.audio_duration, 0)::integer,
        ARRAY[COALESCE(NEW.domain, 'general')]
    )
    ON CONFLICT (user_id, practice_date) DO UPDATE SET
        attempts_count = practice_sessions.attempts_count + 1,
        average_score = ROUND(((practice_sessions.average_score * practice_sessions.attempts_count + NEW.final_score) / (practice_sessions.attempts_count + 1))::numeric, 2),
        best_score = GREATEST(practice_sessions.best_score, NEW.final_score),
        total_duration_seconds = practice_sessions.total_duration_seconds + COALESCE(NEW.audio_duration, 0)::integer,
        domains_practiced = (
            CASE 
                WHEN COALESCE(NEW.domain, 'general') = ANY(practice_sessions.domains_practiced) 
                THEN practice_sessions.domains_practiced 
                ELSE array_append(practice_sessions.domains_practiced, COALESCE(NEW.domain, 'general')) 
            END
        ),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- STEP 5: CREATE TRIGGERS
-- =========================================================

-- Auto-create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.interview_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Update skill progress when new attempt is created
CREATE TRIGGER trigger_update_skill_progress
    AFTER INSERT ON public.attempts
    FOR EACH ROW EXECUTE FUNCTION public.update_skill_progress();

-- Update question history when new attempt is created
CREATE TRIGGER trigger_update_question_history
    AFTER INSERT ON public.attempts
    FOR EACH ROW EXECUTE FUNCTION public.update_question_history();

-- Update user stats when new attempt is created
CREATE TRIGGER trigger_update_user_stats
    AFTER INSERT ON public.attempts
    FOR EACH ROW EXECUTE FUNCTION public.update_user_stats();

-- =========================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- STEP 7: CREATE RLS POLICIES
-- =========================================================
-- 
-- NOTE: Service role key bypasses ALL RLS policies.
-- These policies are for client-side access with anon/authenticated keys.
-- The backend uses service_role key, so it can always read/write.
--

-- USERS policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- QUESTIONS policies (public read, authenticated write for custom)
CREATE POLICY "Anyone can read active questions" ON public.questions
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Authenticated users can add questions" ON public.questions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own custom questions" ON public.questions
    FOR UPDATE USING (uploaded_by = auth.uid() AND is_custom = TRUE);

-- INTERVIEW SESSIONS policies
CREATE POLICY "Users can view own sessions" ON public.interview_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.interview_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.interview_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- ATTEMPTS policies
CREATE POLICY "Users can view own attempts" ON public.attempts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own attempts" ON public.attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SKILL PROGRESS policies
CREATE POLICY "Users can view own skill progress" ON public.skill_progress
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own skill progress" ON public.skill_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skill progress" ON public.skill_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- QUESTION HISTORY policies
CREATE POLICY "Users can view own question history" ON public.question_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own question history" ON public.question_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own question history" ON public.question_history
    FOR UPDATE USING (auth.uid() = user_id);

-- INTERVIEW REPORTS policies
CREATE POLICY "Users can view own reports" ON public.interview_reports
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reports" ON public.interview_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RESUME ANALYSES policies
CREATE POLICY "Users can view own resume analyses" ON public.resume_analyses
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own resume analyses" ON public.resume_analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resume analyses" ON public.resume_analyses
    FOR UPDATE USING (auth.uid() = user_id);

-- PRACTICE SESSIONS policies
CREATE POLICY "Users can view own practice sessions" ON public.practice_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own practice sessions" ON public.practice_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own practice sessions" ON public.practice_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- =========================================================
-- STEP 8: CREATE INDEXES
-- =========================================================

-- Questions indexes
CREATE INDEX idx_questions_domain ON public.questions(domain);
CREATE INDEX idx_questions_category ON public.questions(category);
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX idx_questions_active ON public.questions(is_active);
CREATE INDEX idx_questions_custom ON public.questions(is_custom);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON public.interview_sessions(user_id);
CREATE INDEX idx_sessions_status ON public.interview_sessions(status);
CREATE INDEX idx_sessions_created ON public.interview_sessions(created_at DESC);
CREATE INDEX idx_sessions_domain ON public.interview_sessions(domain);

-- Attempts indexes
CREATE INDEX idx_attempts_user_id ON public.attempts(user_id);
CREATE INDEX idx_attempts_session_id ON public.attempts(session_id);
CREATE INDEX idx_attempts_question_id ON public.attempts(question_id);
CREATE INDEX idx_attempts_created ON public.attempts(created_at DESC);
CREATE INDEX idx_attempts_domain ON public.attempts(domain);
CREATE INDEX idx_attempts_final_score ON public.attempts(final_score);
CREATE INDEX idx_attempts_is_skipped ON public.attempts(is_skipped);

-- Skill progress indexes
CREATE INDEX idx_skill_user ON public.skill_progress(user_id);
CREATE INDEX idx_skill_name ON public.skill_progress(skill_name);

-- Question history indexes
CREATE INDEX idx_qhist_user ON public.question_history(user_id);
CREATE INDEX idx_qhist_question ON public.question_history(question_id);
CREATE INDEX idx_qhist_last_asked ON public.question_history(last_asked_at DESC);

-- Reports indexes
CREATE INDEX idx_reports_user ON public.interview_reports(user_id);
CREATE INDEX idx_reports_session ON public.interview_reports(session_id);

-- Resume analyses indexes
CREATE INDEX idx_resume_user ON public.resume_analyses(user_id);
CREATE INDEX idx_resume_created ON public.resume_analyses(created_at DESC);

-- Practice sessions indexes
CREATE INDEX idx_practice_user ON public.practice_sessions(user_id);
CREATE INDEX idx_practice_date ON public.practice_sessions(practice_date DESC);
CREATE INDEX idx_practice_user_date ON public.practice_sessions(user_id, practice_date);

-- =========================================================
-- STEP 9: CREATE SECURE ANALYTICS VIEWS
-- =========================================================
-- 
-- These views use SECURITY INVOKER (default) which means they respect
-- the RLS policies of the underlying tables. Each view also includes
-- a WHERE clause to filter by the authenticated user for extra safety.
--

-- User progress overview (only shows current user's data)
CREATE OR REPLACE VIEW user_progress_overview 
WITH (security_invoker = true)
AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.total_attempts,
    u.average_score,
    u.best_score,
    u.current_streak,
    u.longest_streak,
    COUNT(DISTINCT a.question_id) as unique_questions,
    COUNT(DISTINCT DATE(a.created_at)) as practice_days,
    MAX(a.created_at) as last_practice
FROM users u
LEFT JOIN attempts a ON u.id = a.user_id
WHERE u.id = auth.uid()  -- SECURITY: Only show current user's data
GROUP BY u.id, u.email, u.full_name, u.total_attempts, u.average_score, u.best_score, u.current_streak, u.longest_streak;

-- Skill breakdown view (only shows current user's skills)
CREATE OR REPLACE VIEW skill_breakdown 
WITH (security_invoker = true)
AS
SELECT 
    user_id,
    skill_name,
    current_avg,
    previous_avg,
    best_score,
    worst_score,
    trend,
    trend_percentage,
    attempts_count,
    last_practiced_at
FROM skill_progress
WHERE user_id = auth.uid()  -- SECURITY: Only show current user's data
ORDER BY skill_name;

-- Session summary view (only shows current user's sessions)
CREATE OR REPLACE VIEW session_summary 
WITH (security_invoker = true)
AS
SELECT 
    s.id as session_id,
    s.user_id,
    s.domain,
    s.job_title,
    s.status,
    s.total_questions,
    s.completed_questions,
    s.avg_final_score,
    COUNT(a.id) as attempt_count,
    s.started_at,
    s.completed_at,
    s.created_at
FROM interview_sessions s
LEFT JOIN attempts a ON s.id = a.session_id
WHERE s.user_id = auth.uid()  -- SECURITY: Only show current user's data
GROUP BY s.id, s.user_id, s.domain, s.job_title, s.status, s.total_questions, 
         s.completed_questions, s.avg_final_score, s.started_at, s.completed_at, s.created_at;

-- =========================================================
-- STEP 10: SEED DATA - Sample Questions
-- =========================================================

INSERT INTO public.questions (question, category, difficulty, domain, keywords, ideal_answer, time_limit_seconds) VALUES

-- SOFTWARE ENGINEERING - BEHAVIORAL
('Tell me about a time when you had to debug a complex issue under pressure.', 'behavioral', 'medium', 'software_engineering', 
 ARRAY['debugging', 'pressure', 'problem-solving', 'systematic', 'root cause'],
 'Describe the situation clearly, explain your systematic approach to debugging, mention specific tools or techniques used, and highlight the successful resolution with lessons learned. Use the STAR method.', 120),

('Describe a situation where you disagreed with a technical decision made by your team.', 'behavioral', 'medium', 'software_engineering',
 ARRAY['disagreement', 'technical', 'communication', 'compromise', 'collaboration'],
 'Explain the context and the technical decision, articulate your perspective and concerns professionally, describe how you communicated your viewpoint, and share the outcome or compromise reached.', 120),

('Tell me about a project where you had to learn a new technology quickly.', 'behavioral', 'easy', 'software_engineering',
 ARRAY['learning', 'adaptability', 'new technology', 'self-directed', 'growth'],
 'Describe the technology and why it was needed, explain your learning approach and resources used, and demonstrate how you successfully applied the new knowledge.', 120),

('Describe a time when you had to meet a tight deadline with limited resources.', 'behavioral', 'hard', 'software_engineering',
 ARRAY['deadline', 'prioritization', 'resourcefulness', 'delivery', 'trade-offs'],
 'Set the context with specific constraints, explain your prioritization strategy, describe trade-offs made, and highlight the successful delivery with lessons learned.', 120),

-- SOFTWARE ENGINEERING - TECHNICAL
('How would you design a URL shortening service like bit.ly?', 'technical', 'hard', 'software_engineering',
 ARRAY['system design', 'scalability', 'database', 'API', 'hashing', 'distributed systems'],
 'Discuss functional and non-functional requirements, API design, database schema, URL generation algorithm (base62 encoding), caching strategy (Redis), and horizontal scalability considerations.', 180),

('Explain the difference between REST and GraphQL APIs.', 'technical', 'medium', 'software_engineering',
 ARRAY['REST', 'GraphQL', 'API', 'over-fetching', 'under-fetching', 'flexibility'],
 'Compare request/response structure, data fetching flexibility (over/under-fetching), caching strategies, versioning approaches, and provide use cases where each excels.', 120),

('What are microservices and when would you use them over a monolith?', 'technical', 'medium', 'software_engineering',
 ARRAY['microservices', 'monolith', 'scalability', 'deployment', 'complexity', 'team structure'],
 'Define microservices architecture, compare with monolithic approach, discuss trade-offs (complexity vs. scalability), and provide scenarios favoring each approach.', 150),

('How do you ensure code quality in your projects?', 'technical', 'medium', 'software_engineering',
 ARRAY['code review', 'testing', 'CI/CD', 'linting', 'documentation', 'standards'],
 'Discuss code reviews, automated testing (unit, integration, e2e), CI/CD pipelines, linting/formatting, documentation practices, and team coding standards.', 120),

-- MANAGEMENT
('Tell me about a time you had to manage an underperforming team member.', 'behavioral', 'hard', 'management',
 ARRAY['performance management', 'feedback', 'coaching', 'improvement plan', 'difficult conversations'],
 'Describe the situation and how you identified the issue, explain your approach to understanding root causes, detail the improvement plan created, and share the outcome with lessons learned.', 150),

('How do you prioritize competing demands from multiple stakeholders?', 'behavioral', 'medium', 'management',
 ARRAY['prioritization', 'stakeholder management', 'communication', 'decision-making', 'trade-offs'],
 'Explain your prioritization framework (impact, urgency, alignment), how you gather stakeholder input, communicate trade-offs transparently, and manage expectations.', 120),

('Describe a time when you had to lead a team through a significant change.', 'behavioral', 'medium', 'management',
 ARRAY['change management', 'leadership', 'communication', 'resistance', 'adoption'],
 'Set the context of the change, explain your communication strategy, how you addressed resistance or concerns, supported the team through transition, and measured success.', 150),

('How do you build and maintain team culture?', 'behavioral', 'medium', 'management',
 ARRAY['culture', 'team building', 'values', 'inclusion', 'engagement'],
 'Discuss defining team values, hiring for culture add, creating psychological safety, recognition practices, and regular team rituals or activities.', 120),

-- FINANCE
('Walk me through a DCF valuation model.', 'technical', 'hard', 'finance',
 ARRAY['DCF', 'valuation', 'cash flow', 'discount rate', 'WACC', 'terminal value'],
 'Explain the process: forecast free cash flows (5-10 years), determine WACC as discount rate, calculate terminal value (perpetuity or exit multiple), discount all to present value, and discuss sensitivity analysis.', 180),

('How would you analyze a companys creditworthiness?', 'technical', 'medium', 'finance',
 ARRAY['credit analysis', 'financial ratios', 'cash flow', 'risk assessment', 'debt capacity'],
 'Discuss key ratios (leverage, coverage, liquidity), cash flow analysis, industry comparison, qualitative factors (management, business model), and rating agency frameworks.', 150),

('Tell me about a time you identified a financial risk that others missed.', 'behavioral', 'medium', 'finance',
 ARRAY['risk identification', 'analysis', 'attention to detail', 'communication', 'impact'],
 'Describe the situation and your analysis process, explain how you identified the overlooked risk, how you communicated it to stakeholders, and the ultimate outcome.', 120),

-- TEACHING
('How do you differentiate instruction for students with varying abilities?', 'behavioral', 'medium', 'teaching',
 ARRAY['differentiation', 'inclusion', 'assessment', 'individualized learning', 'scaffolding'],
 'Explain your approach to understanding student needs through assessment, strategies for differentiation (content, process, product), and how you measure success for all learners.', 120),

('Describe a lesson that didnt go as planned and what you learned.', 'behavioral', 'easy', 'teaching',
 ARRAY['reflection', 'adaptability', 'learning', 'improvement', 'flexibility'],
 'Describe the lesson and what went wrong, how you adapted in the moment, what you reflected on afterward, and specific changes made for future lessons.', 120),

('How do you incorporate technology into your teaching?', 'behavioral', 'easy', 'teaching',
 ARRAY['technology', 'engagement', 'tools', 'digital literacy', 'accessibility'],
 'Describe specific tools you use (LMS, interactive tools, assessment platforms), how they enhance learning outcomes, and how you ensure equitable access for all students.', 120),

-- SALES
('Tell me about your most challenging sale and how you closed it.', 'behavioral', 'medium', 'sales',
 ARRAY['persistence', 'objection handling', 'relationship building', 'closing', 'complex sale'],
 'Describe the challenges (objections, competition, long cycle), your strategy for building relationships and handling objections, and the ultimate successful close.', 120),

('How do you handle rejection in sales?', 'behavioral', 'easy', 'sales',
 ARRAY['resilience', 'learning', 'mindset', 'improvement', 'persistence'],
 'Explain your mindset toward rejection, how you process and learn from it, specific techniques for staying motivated, and how rejection has made you better.', 90),

('Walk me through your sales process from prospecting to close.', 'technical', 'medium', 'sales',
 ARRAY['prospecting', 'qualification', 'discovery', 'presentation', 'negotiation', 'closing'],
 'Detail each stage: prospecting and lead generation, qualification criteria, discovery process, solution presentation, handling objections, negotiation, and closing techniques.', 150),

-- GENERAL/SITUATIONAL
('Tell me about yourself.', 'general', 'easy', 'general',
 ARRAY['introduction', 'background', 'experience', 'goals', 'fit'],
 'Provide a concise professional summary: current role/situation, relevant experience highlights, key achievements, and why youre excited about this opportunity. Keep it under 2 minutes.', 90),

('Why are you interested in this role?', 'general', 'easy', 'general',
 ARRAY['motivation', 'research', 'alignment', 'enthusiasm', 'career goals'],
 'Demonstrate research about the company and role, align your skills and experience with requirements, express genuine enthusiasm, and connect to your career goals.', 90),

('What is your greatest weakness?', 'behavioral', 'easy', 'general',
 ARRAY['self-awareness', 'improvement', 'honesty', 'growth mindset'],
 'Share a genuine weakness (not a disguised strength), explain your awareness of it, specific steps youre taking to improve, and progress made.', 90),

('Where do you see yourself in 5 years?', 'general', 'easy', 'general',
 ARRAY['career goals', 'ambition', 'planning', 'growth', 'alignment'],
 'Share realistic career aspirations that align with the company trajectory, demonstrate ambition balanced with commitment, and show thoughtfulness about your growth.', 90),

('Describe a situation where you had to work with a difficult colleague.', 'situational', 'medium', 'general',
 ARRAY['conflict resolution', 'communication', 'empathy', 'professionalism', 'collaboration'],
 'Describe the situation objectively, explain your approach to understanding their perspective, specific actions taken to improve the relationship, and the positive outcome.', 120)

ON CONFLICT DO NOTHING;

-- =========================================================
-- DONE! Database schema is ready.
-- =========================================================
-- 
-- Summary:
--   ✓ 9 tables created:
--     - users, questions, interview_sessions, attempts
--     - skill_progress, question_history, interview_reports
--     - resume_analyses (NEW), practice_sessions (NEW)
--   ✓ 5 functions created:
--     - handle_new_user, update_updated_at
--     - update_skill_progress, update_question_history
--     - update_user_stats (NEW)
--   ✓ 7 triggers created
--   ✓ RLS enabled on all 9 tables with appropriate policies
--   ✓ Comprehensive indexes for all common queries
--   ✓ 3 SECURE analytics views created (filter by auth.uid())
--   ✓ 25 sample questions seeded across multiple domains
--
-- SECURITY SUMMARY:
--   ✓ RLS enabled on all 9 tables
--   ✓ All views filter by auth.uid() - users can ONLY see own data
--   ✓ Views use SECURITY INVOKER to respect RLS policies
--
-- IMPORTANT: Backend should use SUPABASE_SERVICE_ROLE_KEY
-- to bypass RLS for server-side operations!
--
-- Next steps:
--   1. Run this SQL in Supabase SQL Editor
--   2. Verify tables in Table Editor
--   3. Add SUPABASE_SERVICE_ROLE_KEY to backend .env
--   4. Test by creating an account and making attempts
--
-- =========================================================


-- =========================================================
-- STEP 11: CREATE STORAGE BUCKETS
-- =========================================================
-- 
-- Storage buckets for file uploads:
--   - audio-recordings: Interview audio files (optional)
--   - resumes: Resume uploads for analysis
--
-- NOTE: If this fails with "permission denied", create buckets
-- manually in the Supabase Dashboard -> Storage -> New Bucket
-- =========================================================

-- Create audio-recordings bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio-recordings',
    'audio-recordings',
    false,  -- Private bucket
    52428800,  -- 50 MB limit
    ARRAY['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create resumes bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false,  -- Private bucket
    10485760,  -- 10 MB limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create avatars bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,  -- Public bucket for easy profile display
    2097152,  -- 2 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;


-- =========================================================
-- STEP 12: STORAGE RLS POLICIES
-- =========================================================
-- 
-- Security policies for storage buckets:
-- - Users can only access their own files
-- - Files are organized by user ID folders
-- =========================================================

-- Enable RLS on storage.objects (if not already enabled)
-- Note: This might already be enabled in Supabase

-- AUDIO BUCKET POLICIES
-- Users can upload audio to their own folder
DROP POLICY IF EXISTS "Users can upload own audio" ON storage.objects;
CREATE POLICY "Users can upload own audio"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'audio-recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own audio files
DROP POLICY IF EXISTS "Users can view own audio" ON storage.objects;
CREATE POLICY "Users can view own audio"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'audio-recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own audio files
DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;
CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'audio-recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RESUME BUCKET POLICIES
-- Users can upload resumes to their own folder
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own resume files
DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
CREATE POLICY "Users can view own resumes"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own resume files
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- AVATAR BUCKET POLICIES
-- Users can upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Public read access for avatars (since bucket is public)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );


-- =========================================================
-- DONE! Database and Storage are ready.
-- =========================================================
-- 
-- Summary:
--   ✓ 9 tables created with proper relationships
--   ✓ 5 functions for automatic data updates
--   ✓ 7 triggers for real-time updates
--   ✓ RLS enabled on all tables
--   ✓ 3 secure analytics views
--   ✓ 25 sample questions seeded
--   ✓ 2 storage buckets created (audio-recordings, resumes)
--   ✓ Storage RLS policies for user isolation
--
-- Free Tier Capacity:
--   Database: 500 MB (you'll use ~10 MB)
--   Storage: 1 GB (you'll use ~100 MB)
--   Perfect for 5 users × 10 sessions each!
--
-- =========================================================
