-- Enhanced Comments Features Migration
-- Adds support for mentions, notifications, moderation, and soft delete

-- Add new columns to lesson_comments table
ALTER TABLE public.lesson_comments 
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_helpful BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Create comment_mentions table
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, mentioned_user_id)
);

-- Create comment_notifications table
CREATE TABLE IF NOT EXISTS public.comment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('mention', 'reply', 'reaction')),
  triggered_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for comment_mentions
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions they're involved in"
  ON public.comment_mentions FOR SELECT
  USING (
    auth.uid() = mentioned_user_id OR 
    auth.uid() = mentioner_user_id
  );

CREATE POLICY "Users can create mentions"
  ON public.comment_mentions FOR INSERT
  WITH CHECK (auth.uid() = mentioner_user_id);

CREATE POLICY "Users can delete their own mentions"
  ON public.comment_mentions FOR DELETE
  USING (auth.uid() = mentioner_user_id);

-- RLS for comment_notifications
ALTER TABLE public.comment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.comment_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications"
  ON public.comment_notifications FOR INSERT
  WITH CHECK (true); -- Anyone can create notifications for others

CREATE POLICY "Users can update their own notifications"
  ON public.comment_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.comment_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Add policy for updating lesson_comments (for editing, pinning, etc.)
CREATE POLICY "Users can update their own comments or creators can moderate"
  ON public.lesson_comments FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_comments.lesson_id
      AND c.creator_id = auth.uid()
    )
  );

-- Add policy for soft delete
CREATE POLICY "Users can soft delete their own comments or creators can delete"
  ON public.lesson_comments FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_comments.lesson_id
      AND c.creator_id = auth.uid()
    )
  );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE comment_mentions;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_notifications;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user ON public.comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON public.comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_user ON public.comment_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_comment ON public.comment_notifications(comment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_pinned ON public.lesson_comments(lesson_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_lesson_comments_deleted ON public.lesson_comments(is_deleted) WHERE is_deleted = FALSE;

-- Function to automatically create notification on mention
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.comment_notifications (
    user_id,
    comment_id,
    lesson_id,
    notification_type,
    triggered_by_user_id
  )
  SELECT 
    NEW.mentioned_user_id,
    NEW.comment_id,
    lc.lesson_id,
    'mention',
    NEW.mentioner_user_id
  FROM public.lesson_comments lc
  WHERE lc.id = NEW.comment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for mention notifications
DROP TRIGGER IF EXISTS on_mention_created ON public.comment_mentions;
CREATE TRIGGER on_mention_created
  AFTER INSERT ON public.comment_mentions
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();

-- Function to create notification on reply
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if it's a reply (has parent_comment_id)
  IF NEW.parent_comment_id IS NOT NULL THEN
    INSERT INTO public.comment_notifications (
      user_id,
      comment_id,
      lesson_id,
      notification_type,
      triggered_by_user_id
    )
    SELECT 
      parent.user_id,
      NEW.id,
      NEW.lesson_id,
      'reply',
      NEW.user_id
    FROM public.lesson_comments parent
    WHERE parent.id = NEW.parent_comment_id
    AND parent.user_id != NEW.user_id; -- Don't notify if replying to own comment
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for reply notifications
DROP TRIGGER IF EXISTS on_reply_created ON public.lesson_comments;
CREATE TRIGGER on_reply_created
  AFTER INSERT ON public.lesson_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_reply_notification();
