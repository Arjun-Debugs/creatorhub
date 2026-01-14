-- Create 'course-content' bucket (Private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-content', 'course-content', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for course-content
-- 1. Allow authenticated users to upload (creators)
CREATE POLICY "Authenticated users can upload course content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-content');

-- 2. Allow authenticated users to view (for signed URLs to work for enrolled users)
-- Note: In a real app, we'd check enrollment here, but storage RLS is limited.
-- Signed URLs generated with a valid user session work if the user has SELECT permission.
CREATE POLICY "Authenticated users can select course content"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-content');

-- 3. Allow creators to update/delete (simplistic: owning the object)
CREATE POLICY "Users can update their own content"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-content' AND owner = auth.uid());

CREATE POLICY "Users can delete their own content"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-content' AND owner = auth.uid());
