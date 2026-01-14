-- Create discussions table (Course-level forums)
CREATE TABLE public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create discussion_replies table
CREATE TABLE public.discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create lesson_comments table (Lesson-level comments)
CREATE TABLE public.lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Policies for Discussions
-- Everyone can view discussions (or restrict to enrolled? Let's keep it open for now to drive interest, or stick to enrolled. Let's restrict to enrolled/creators for quality).
-- Actually, typically you want prospective students to see Q&A to judge activity, but let's be safe and restrict to enrolled/creators.
CREATE POLICY "View discussions"
ON public.discussions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.course_id = discussions.course_id AND e.user_id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = discussions.course_id AND c.creator_id = auth.uid()
  )
);

CREATE POLICY "Create discussions"
ON public.discussions FOR INSERT
WITH CHECK (auth.uid() = user_id); -- Basic check, ideally also check enrollment

-- Policies for Replies
CREATE POLICY "View replies"
ON public.discussion_replies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.discussions d
    JOIN public.courses c ON c.id = d.course_id
    LEFT JOIN public.enrollments e ON e.course_id = c.id AND e.user_id = auth.uid()
    WHERE d.id = discussion_replies.discussion_id 
    AND (e.id IS NOT NULL OR c.creator_id = auth.uid())
  )
);

CREATE POLICY "Create replies"
ON public.discussion_replies FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policies for Lesson Comments
CREATE POLICY "View lesson comments"
ON public.lesson_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    LEFT JOIN public.enrollments e ON e.course_id = c.id AND e.user_id = auth.uid()
    WHERE l.id = lesson_comments.lesson_id
    AND (e.id IS NOT NULL OR c.creator_id = auth.uid())
  )
);

CREATE POLICY "Create lesson comments"
ON public.lesson_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_comments;
