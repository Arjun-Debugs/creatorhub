import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import ModuleManager from "./ModuleManager";
import LessonEditor from "./LessonEditor";
import { Module, Lesson } from "@/types";

export default function LessonsManager() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<(Module & { lessons: Lesson[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetchCourseAndContent();
  }, [courseId]);

  const fetchCourseAndContent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch Course
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .eq("creator_id", user.id)
      .single();

    if (courseError || !courseData) {
      toast.error("Course not found");
      navigate("/dashboard");
      return;
    }
    setCourse(courseData);

    // Fetch Modules
    const { data: modulesData, error: modulesError } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    if (modulesError) {
      toast.error("Error fetching modules");
      return;
    }

    // Fetch Lessons
    const { data: lessonsData, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    if (lessonsError) {
      toast.error("Error fetching lessons");
      return;
    }

    // Group Lessons by Module
    const combinedModules = (modulesData || []).map((mod: any) => ({
      ...mod,
      lessons: (lessonsData || []).filter((l: any) => l.module_id === mod.id),
    }));

    setModules(combinedModules);
    setLoading(false);
  };

  const handleOpenAddLesson = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setEditingLesson(null);
    setEditorOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setActiveModuleId(lesson.module_id);
    setEditingLesson(lesson);
    setEditorOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string, contentUrl: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;

    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);

    if (error) {
      toast.error("Failed to delete lesson");
    } else {
      toast.success("Lesson deleted");
      fetchCourseAndContent();
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{course?.title}</h1>
        <p className="text-muted-foreground">Manage your course content</p>
      </div>

      <ModuleManager
        courseId={courseId!}
        modules={modules}
        onUpdate={fetchCourseAndContent}
        onAddLesson={handleOpenAddLesson}
        onEditLesson={handleEditLesson}
        onDeleteLesson={handleDeleteLesson}
      />

      {activeModuleId && (
        <LessonEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          moduleId={activeModuleId}
          courseId={courseId!}
          lesson={editingLesson}
          onSuccess={fetchCourseAndContent}
        />
      )}
    </div>
  );
}
