-- Create course_progress table for detailed tracking
CREATE TABLE IF NOT EXISTS public.course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  time_spent_seconds INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Create indexes for performance
CREATE INDEX idx_course_progress_user ON public.course_progress(user_id);
CREATE INDEX idx_course_progress_course ON public.course_progress(course_id);
CREATE INDEX idx_course_progress_module ON public.course_progress(module_id);
CREATE INDEX idx_course_progress_lesson ON public.course_progress(lesson_id);
CREATE INDEX idx_course_progress_completed ON public.course_progress(user_id, course_id, completed);

-- Enable RLS
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own progress"
  ON public.course_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.course_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their own progress"
  ON public.course_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Creators can view student progress for their courses
CREATE POLICY "Creators can view student progress"
  ON public.course_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_progress.course_id
      AND c.creator_id = auth.uid()
    )
  );

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT, -- Icon name or emoji
  badge_color TEXT DEFAULT '#9333ea', -- Primary color
  criteria JSONB NOT NULL, -- Flexible criteria definition
  points INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_achievements junction table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress_data JSONB, -- For tracking partial progress
  UNIQUE(user_id, achievement_id)
);

-- Create indexes
CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON public.user_achievements(unlocked_at DESC);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are public (everyone can see what achievements exist)
CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  USING (true);

-- Users can view their own unlocked achievements
CREATE POLICY "Users can view their achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert achievements (via functions)
CREATE POLICY "System can insert achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create lesson_resources table for downloadable materials
CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT, -- pdf, zip, doc, etc.
  file_size_bytes BIGINT,
  download_count INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_lesson_resources_lesson ON public.lesson_resources(lesson_id);
CREATE INDEX idx_lesson_resources_order ON public.lesson_resources(lesson_id, order_index);

-- Enable RLS
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

-- Enrolled students and creators can view resources
CREATE POLICY "Enrolled users can view resources"
  ON public.lesson_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      LEFT JOIN public.enrollments e ON e.course_id = c.id AND e.user_id = auth.uid()
      WHERE l.id = lesson_resources.lesson_id
      AND (e.id IS NOT NULL OR c.creator_id = auth.uid())
    )
  );

-- Creators can manage resources for their lessons
CREATE POLICY "Creators can manage resources"
  ON public.lesson_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_resources.lesson_id
      AND c.creator_id = auth.uid()
    )
  );

-- Insert default achievements
INSERT INTO public.achievements (name, title, description, icon, badge_color, criteria, points, rarity) VALUES
  ('first_lesson', 'First Steps', 'Complete your first lesson', '🎯', '#9333ea', '{"type": "lesson_completion", "count": 1}', 10, 'common'),
  ('first_course', 'Course Conqueror', 'Complete your first course', '🏆', '#eab308', '{"type": "course_completion", "count": 1}', 100, 'rare'),
  ('five_courses', 'Learning Legend', 'Complete 5 courses', '⭐', '#f59e0b', '{"type": "course_completion", "count": 5}', 500, 'epic'),
  ('week_streak', 'Week Warrior', 'Learn for 7 days in a row', '🔥', '#ef4444', '{"type": "daily_streak", "count": 7}', 50, 'rare'),
  ('month_streak', 'Monthly Master', 'Learn for 30 days in a row', '💪', '#dc2626', '{"type": "daily_streak", "count": 30}', 300, 'legendary'),
  ('helpful_commenter', 'Community Helper', 'Post 10 helpful comments', '💬', '#3b82f6', '{"type": "helpful_comments", "count": 10}', 75, 'rare'),
  ('early_bird', 'Early Adopter', 'Join within first month', '🐦', '#06b6d4', '{"type": "early_signup", "days": 30}', 25, 'common')
ON CONFLICT (name) DO NOTHING;

-- Create function to update progress
CREATE OR REPLACE FUNCTION public.update_lesson_progress(
  p_lesson_id UUID,
  p_completed BOOLEAN DEFAULT TRUE,
  p_time_spent INTEGER DEFAULT 0
)
RETURNS public.course_progress
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course_id UUID;
  v_module_id UUID;
  v_progress RECORD;
BEGIN
  -- Get course and module IDs
  SELECT l.course_id, l.module_id INTO v_course_id, v_module_id
  FROM public.lessons l
  WHERE l.id = p_lesson_id;

  -- Insert or update progress
  INSERT INTO public.course_progress (
    user_id,
    course_id,
    module_id,
    lesson_id,
    completed,
    progress_percentage,
    time_spent_seconds,
    completed_at
  ) VALUES (
    auth.uid(),
    v_course_id,
    v_module_id,
    p_lesson_id,
    p_completed,
    CASE WHEN p_completed THEN 100 ELSE 50 END,
    p_time_spent,
    CASE WHEN p_completed THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET
    completed = EXCLUDED.completed,
    progress_percentage = EXCLUDED.progress_percentage,
    time_spent_seconds = course_progress.time_spent_seconds + EXCLUDED.time_spent_seconds,
    completed_at = EXCLUDED.completed_at,
    last_accessed_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_progress;

  RETURN v_progress;
END;
$$;

-- Create function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lesson_count INTEGER;
  v_course_count INTEGER;
BEGIN
  -- Check for first lesson completion
  IF NEW.completed = TRUE THEN
    SELECT COUNT(*) INTO v_lesson_count
    FROM public.course_progress
    WHERE user_id = NEW.user_id AND completed = TRUE;

    IF v_lesson_count = 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      SELECT NEW.user_id, id FROM public.achievements WHERE name = 'first_lesson'
      ON CONFLICT DO NOTHING;
    END IF;

    -- Check for course completion
    -- A course is complete when all its lessons are completed
    IF NOT EXISTS (
      SELECT 1 FROM public.lessons l
      LEFT JOIN public.course_progress cp ON cp.lesson_id = l.id AND cp.user_id = NEW.user_id
      WHERE l.course_id = NEW.course_id
      AND (cp.completed IS NULL OR cp.completed = FALSE)
    ) THEN
      -- Course is complete
      SELECT COUNT(DISTINCT course_id) INTO v_course_count
      FROM public.course_progress
      WHERE user_id = NEW.user_id
      AND course_id IN (
        SELECT DISTINCT course_id FROM public.course_progress cp2
        WHERE cp2.user_id = NEW.user_id
        AND NOT EXISTS (
          SELECT 1 FROM public.lessons l2
          LEFT JOIN public.course_progress cp3 ON cp3.lesson_id = l2.id AND cp3.user_id = NEW.user_id
          WHERE l2.course_id = cp2.course_id
          AND (cp3.completed IS NULL OR cp3.completed = FALSE)
        )
      );

      IF v_course_count = 1 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        SELECT NEW.user_id, id FROM public.achievements WHERE name = 'first_course'
        ON CONFLICT DO NOTHING;
      ELSIF v_course_count = 5 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        SELECT NEW.user_id, id FROM public.achievements WHERE name = 'five_courses'
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for achievement checking
DROP TRIGGER IF EXISTS trigger_check_achievements ON public.course_progress;
CREATE TRIGGER trigger_check_achievements
  AFTER INSERT OR UPDATE ON public.course_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_achievements();

-- Enable realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
