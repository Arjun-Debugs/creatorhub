# CreatorHub - Immediate Development Tasks (Phase 1)

Thank you for the thorough analysis! Based on your findings, we need to fix critical security issues and structural problems before moving forward. Here's our priority plan:

---

## 🚨 PHASE 1: Critical Fixes & Restructuring (Do This First)

### **Task 1: Fix Content Security Vulnerability (URGENT)**

**Problem:** `CourseViewer.tsx` uses `getPublicUrl()` on a private bucket, which either:
- Breaks media playback (files won't load), OR
- Exposes security risk if bucket is made public

**Solution:**
1. **Update `CourseViewer.tsx`** to use `createSignedUrl()` instead of `getPublicUrl()`
2. Signed URLs should:
   - Expire in 1 hour (3600 seconds)
   - Be regenerated when needed
   - Only be accessible to enrolled users

**Implementation:**
```typescript
// Instead of:
const { data } = supabase.storage.from('course-content').getPublicUrl(path)

// Use:
const { data, error } = await supabase.storage
  .from('course-content')
  .createSignedUrl(path, 3600) // 1 hour expiration

if (error) {
  console.error('Error creating signed URL:', error)
  return null
}

return data.signedUrl
```

**Also verify:**
- Enrollment check happens BEFORE generating signed URL
- Only enrolled users can access course content
- Add proper error handling and user feedback

**Deliverable:** Working video/PDF playback for enrolled users only, with signed URLs.

---

### **Task 2: Database Schema Refactor - Add Modules Structure**

**Problem:** Current structure is `Course → Lessons` (flat). Requirements need `Course → Modules → Lessons` (hierarchical).

**Solution:** Create proper 3-tier structure.

#### **Step 2.1: Create Modules Table**

Create a new Supabase migration file:

```sql
-- Create modules table
CREATE TABLE modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
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
```

#### **Step 2.2: Update Lessons Table**

Modify lessons table to reference modules instead of courses:

```sql
-- Add module_id column to lessons
ALTER TABLE lessons ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX idx_lessons_module_id ON lessons(module_id);

-- For existing data: Create a default module for each course
-- (This migrates existing lessons to new structure)
DO $$
DECLARE
  course_record RECORD;
  default_module_id UUID;
BEGIN
  FOR course_record IN SELECT DISTINCT course_id FROM lessons WHERE module_id IS NULL
  LOOP
    -- Create default module for this course
    INSERT INTO modules (course_id, title, description, order_index)
    VALUES (course_record.course_id, 'Main Content', 'Default module', 1)
    RETURNING id INTO default_module_id;
    
    -- Assign all lessons of this course to the default module
    UPDATE lessons 
    SET module_id = default_module_id 
    WHERE course_id = course_record.course_id AND module_id IS NULL;
  END LOOP;
END $$;

-- Now make module_id required
ALTER TABLE lessons ALTER COLUMN module_id SET NOT NULL;

-- Optional: Remove course_id from lessons (since it's redundant)
-- ALTER TABLE lessons DROP COLUMN course_id;
-- (Keep it for now for backward compatibility, remove later)
```

#### **Step 2.3: Update TypeScript Types**

Create/update `src/types/index.ts`:

```typescript
export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  course_id?: string; // Keep for backward compatibility temporarily
  title: string;
  content_type: 'video' | 'pdf' | 'image' | 'audio' | 'text';
  content_url?: string;
  duration_minutes?: number;
  order_index: number;
  is_free_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  price?: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

// Extended course with modules and lessons
export interface CourseWithContent extends Course {
  modules: (Module & {
    lessons: Lesson[];
  })[];
}
```

**Deliverable:** Database structure supports Course → Modules → Lessons.

---

### **Task 3: Update Course Management UI**

Now update the creator interface to work with modules.

#### **Step 3.1: Create ModuleManager Component**

Create `src/components/creator/ModuleManager.tsx`:

This component should:
- Display all modules for a course
- Allow adding new modules
- Allow editing module title/description
- Allow reordering modules (drag-and-drop or up/down buttons)
- Delete modules (with confirmation)
- Expand/collapse to show lessons inside each module

#### **Step 3.2: Update LessonsManager**

Modify `src/components/creator/LessonsManager.tsx`:

- Lessons now belong to a MODULE, not directly to a course
- When creating a lesson, user must select which module it goes into
- Show lessons grouped by module
- Allow moving lessons between modules

#### **Step 3.3: Update Course Builder Flow**

Create a multi-step course creation wizard:

**Step 1:** Basic course info (title, description, price, thumbnail)
**Step 2:** Create modules (add at least 1 module)
**Step 3:** Add lessons to each module
**Step 4:** Preview and publish

**Deliverable:** Creators can create courses with modules and lessons in proper structure.

---

### **Task 4: Update Course Viewer for Modules**

#### **Step 4.1: Update CourseViewer.tsx**

Modify `src/pages/CourseViewer.tsx`:

- Fetch course with nested modules and lessons
- Display module accordion/tabs
- Show lessons within each module
- Track progress per module
- Use signed URLs for content (from Task 1)

**UI Layout:**
```
┌─────────────────────────────────────────┐
│ Course Title                             │
│ Progress: 45% complete                   │
├─────────────────────────────────────────┤
│ 📚 Module 1: Introduction       [▼]     │
│   ├─ ✅ Lesson 1: Welcome                │
│   ├─ ▶️  Lesson 2: Getting Started       │
│   └─ 🔒 Lesson 3: Basic Concepts         │
├─────────────────────────────────────────┤
│ 📚 Module 2: Advanced Topics    [▶]     │
│   (collapsed)                            │
├─────────────────────────────────────────┤
│                                          │
│  [Video Player / Content Display]       │
│                                          │
└─────────────────────────────────────────┘
```

**Features:**
- Click lesson to load content in player
- Mark lesson as complete
- Lock lessons until previous ones are completed (optional)
- Show module progress (e.g., "3/5 lessons complete")

**Deliverable:** Learners can navigate course by modules, view content securely.

---

### **Task 5: Improve Content Security (Beyond Signed URLs)**

#### **Step 5.1: Enhance Watermark**

Current watermark is CSS-only (easily removed). Improve it:

**For Videos:**
- Add semi-transparent overlay with user email
- Position: Multiple locations (rotate every 30 seconds)
- Make it part of video rendering (not just CSS)
- Consider using canvas overlay

**For PDFs:**
- Use `react-pdf` library with custom rendering
- Disable right-click context menu
- Disable browser print dialog
- Add watermark to each page

#### **Step 5.2: Disable Download/Recording**

Add to `CourseViewer.tsx`:

```typescript
useEffect(() => {
  // Disable right-click
  const disableRightClick = (e: MouseEvent) => {
    e.preventDefault();
    return false;
  };
  
  // Disable certain keyboard shortcuts
  const disableShortcuts = (e: KeyboardEvent) => {
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      e.keyCode === 123 || // F12
      (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
      (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
      (e.ctrlKey && e.keyCode === 85) // Ctrl+U
    ) {
      e.preventDefault();
      return false;
    }
  };

  document.addEventListener('contextmenu', disableRightClick);
  document.addEventListener('keydown', disableShortcuts);

  return () => {
    document.removeEventListener('contextmenu', disableRightClick);
    document.removeEventListener('keydown', disableShortcuts);
  };
}, []);
```

**Note:** This won't stop determined users, but deters casual copying.

#### **Step 5.3: HLS Streaming (Advanced - Optional for Now)**

For stronger video protection, consider HLS:
- Convert videos to HLS format (.m3u8 playlist)
- Use encrypted HLS segments
- Serve via CDN with token authentication

**Defer this to Phase 2** unless you want maximum security now.

**Deliverable:** Enhanced content protection that deters casual piracy.

---

## 📋 Summary of Phase 1 Deliverables

After completing these 5 tasks, you will have:

1. ✅ **Secure content delivery** - Signed URLs, enrollment verification
2. ✅ **Proper course structure** - Course → Modules → Lessons in database
3. ✅ **Creator module management** - UI to create/edit modules and lessons
4. ✅ **Learner module navigation** - View courses organized by modules
5. ✅ **Enhanced content security** - Watermarks, disabled downloads, signed URLs

---

## 🎯 Implementation Order

**Week 1:**
- Day 1-2: Task 1 (Fix signed URLs) + Task 2 (Database migration)
- Day 3-4: Task 3 (Update creator UI for modules)
- Day 5-7: Task 4 (Update learner course viewer)

**Week 2:**
- Day 1-3: Task 5 (Security enhancements)
- Day 4-5: Testing, bug fixes, polish
- Day 6-7: Documentation, prepare for Phase 2

---

## 🤝 How to Proceed

**Start with Task 1** (most urgent - fixes broken/insecure content viewing).

Please implement Task 1, then show me:
1. The updated `CourseViewer.tsx` code
2. Confirmation that videos/PDFs now load correctly
3. Confirmation that only enrolled users can view content

Once Task 1 works, we'll move to Task 2 (database migration).

**Let me know when Task 1 is complete, and I'll test it before we continue!**

---

## ⚠️ Important Notes

- **Backup your database** before running migrations
- **Test each task** before moving to the next
- **Ask questions** if anything is unclear
- **Don't skip tasks** - they build on each other

Let's build this properly! 🚀