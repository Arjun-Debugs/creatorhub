-- Update lesson_comments table to support threading and reactions
ALTER TABLE public.lesson_comments 
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;

-- Create comment_reactions table to track user reactions
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- RLS for comment_reactions
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reactions"
  ON public.comment_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON public.comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
  ON public.comment_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.comment_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Update discussion_replies similarly
ALTER TABLE public.discussion_replies 
  ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;

-- Create discussion_reactions table
CREATE TABLE IF NOT EXISTS public.discussion_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID NOT NULL REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);

-- RLS for discussion_reactions
ALTER TABLE public.discussion_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all discussion reactions"
  ON public.discussion_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own discussion reactions"
  ON public.discussion_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discussion reactions"
  ON public.discussion_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discussion reactions"
  ON public.discussion_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE comment_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE discussion_reactions;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON public.comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_reactions_reply_id ON public.discussion_reactions(reply_id);
CREATE INDEX IF NOT EXISTS idx_discussion_reactions_user_id ON public.discussion_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_parent_id ON public.lesson_comments(parent_comment_id);
