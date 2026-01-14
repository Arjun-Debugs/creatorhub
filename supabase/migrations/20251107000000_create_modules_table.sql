-- Create modules table
CREATE TABLE modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_modules_course_id ON modules(course_id);
CREATE INDEX idx_modules_order ON modules(course_id, order_index);

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow public to read modules of published courses
CREATE POLICY "Public can view modules of published courses"
  ON modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = modules.course_id 
      AND courses.status = 'published'
    )
  );

-- Allow creators to manage their own course modules
CREATE POLICY "Creators can manage their course modules"
  ON modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = modules.course_id 
      AND courses.creator_id = auth.uid()
    )
  );

-- Add module_id column to lessons
ALTER TABLE lessons ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX idx_lessons_module_id ON lessons(module_id);

-- For existing data: Create a default module for each course
DO $$
DECLARE
  course_record RECORD;
  default_module_id UUID;
BEGIN
  FOR course_record IN SELECT DISTINCT course_id FROM lessons WHERE module_id IS NULL
  LOOP
    -- Create default module for this course
    INSERT INTO modules (course_id, title, description, order_index)
    VALUES (course_record.course_id, 'Main Content', 'Default module created during migration', 1)
    RETURNING id INTO default_module_id;
    
    -- Assign all lessons of this course to the default module
    UPDATE lessons 
    SET module_id = default_module_id 
    WHERE course_id = course_record.course_id AND module_id IS NULL;
  END LOOP;
END $$;

-- Now make module_id required
ALTER TABLE lessons ALTER COLUMN module_id SET NOT NULL;
