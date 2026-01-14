import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DiscussionBoard from "@/components/community/DiscussionBoard";
import LessonComments from "@/components/community/LessonComments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, PlayCircle, FileText, Lock, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Module, Lesson } from "@/types";
import { useSecureContent } from "@/hooks/useSecureContent";
import { VideoWatermark } from "@/components/course/VideoWatermark";
import { Module, Lesson } from "@/types";

export default function CourseViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<(Module & { lessons: Lesson[] })[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkEnrollmentAndFetchCourse();
  }, [courseId]);

  useEffect(() => {
    // Disable right-click
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable certain keyboard shortcuts
    const disableShortcuts = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+P
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
        (e.ctrlKey && e.keyCode === 80) // Ctrl+P
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

  useEffect(() => {
    if (currentLesson) {
      // Ensure the module containing the lesson is expanded
      if (currentLesson.module_id) {
        setExpandedModules(prev => new Set(prev).add(currentLesson.module_id));
      }
    }
  }, [currentLesson]);

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const checkEnrollmentAndFetchCourse = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError || !courseData) {
      toast.error("Course not found");
      navigate("/dashboard");
      return;
    }

    setCourse(courseData);

    // Check Enrollment
    const { data: enrollmentData } = await supabase
      .from("enrollments")
      .select("*")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsEnrolled(!!enrollmentData || courseData.is_free);

    if (enrollmentData || courseData.is_free) {
      // Fetch Modules
      const { data: modulesData } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      // Fetch Lessons
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      // Group Lessons
      const combinedModules = (modulesData || []).map((mod: any) => ({
        ...mod,
        lessons: (lessonsData || []).filter((l: any) => l.module_id === mod.id),
      }));

      setModules(combinedModules);

      // Auto-select first lesson if available and none selected
      if (!currentLesson && combinedModules.length > 0 && combinedModules[0].lessons.length > 0) {
        setCurrentLesson(combinedModules[0].lessons[0]);
        setExpandedModules(new Set([combinedModules[0].id]));
      }

      // Fetch Completions
      const { data: completionsData } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("course_id", courseId);

      if (completionsData) {
        setCompletedLessons(new Set(completionsData.map(c => c.lesson_id)));
      }
    }

    setLoading(false);
  };

  // Use secure content hook for automatic signed URL management
  const {
    url: contentUrl,
    watermark,
    loading: contentLoading,
    error: contentError,
    hasAccess: hasContentAccess,
  } = useSecureContent(
    currentLesson?.content_url || null,
    {
      courseId: courseId,
      bucket: 'course-content',
      autoRefresh: true,
    }
  );

  useEffect(() => {
    if (contentError) {
      toast.error(contentError);
    }
  }, [contentError]);

  const handleEnrollFree = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("enrollments").insert({
      user_id: user.id,
      course_id: courseId,
      progress: 0,
    });

    if (error) {
      toast.error("Error enrolling in course");
    } else {
      toast.success("Successfully enrolled!");
      checkEnrollmentAndFetchCourse();
    }
  };

  const handleMarkComplete = async () => {
    if (!currentLesson) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("lesson_completions").insert({
      user_id: user.id,
      lesson_id: currentLesson.id,
      course_id: courseId,
    });

    if (error) {
      if (error.code === '23505') {
        toast.info("Lesson already marked as complete");
      } else {
        toast.error("Error marking lesson complete");
      }
    } else {
      setCompletedLessons(prev => new Set([...prev, currentLesson.id]));
      toast.success("Lesson marked complete!");
      moveToNextLesson();
    }
  };

  const moveToNextLesson = () => {
    if (!currentLesson) return;

    // Find current module and lesson index
    const currentModuleIndex = modules.findIndex(m => m.id === currentLesson.module_id);
    if (currentModuleIndex === -1) return;

    const currentModule = modules[currentModuleIndex];
    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);

    // Try next lesson in same module
    if (currentLessonIndex < currentModule.lessons.length - 1) {
      setCurrentLesson(currentModule.lessons[currentLessonIndex + 1]);
    } else if (currentModuleIndex < modules.length - 1) {
      // Try first lesson of next module
      const nextModule = modules[currentModuleIndex + 1];
      if (nextModule.lessons.length > 0) {
        setCurrentLesson(nextModule.lessons[0]);
        setExpandedModules(prev => new Set(prev).add(nextModule.id));
      }
    }
  };

  const renderContent = () => {
    if (!currentLesson || !contentUrl) return null;

    const fileExt = currentLesson.content_url.split('.').pop()?.toLowerCase();

    if (['mp4', 'webm', 'ogg'].includes(fileExt || '')) {
      return (
        <div className="relative">
          <video
            controls
            controlsList="nodownload"
            className="w-full rounded-lg"
            key={contentUrl}
            onContextMenu={(e) => e.preventDefault()}
          >
            <source src={contentUrl} type={`video/${fileExt}`} />
            Your browser does not support video playback.
          </video>
          {watermark && (
            <VideoWatermark
              text={watermark.text}
              position={watermark.position}
            />
          )}
        </div>
      );
    }

    if (fileExt === 'pdf') {
      return (
        <div className="w-full rounded-lg border bg-muted">
          <object
            data={contentUrl}
            type="application/pdf"
            className="w-full h-[700px]"
          >
            <div className="flex flex-col items-center justify-center h-[700px] p-8">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">PDF Document</p>
              <p className="text-muted-foreground mb-4">{currentLesson.title}</p>
              <a href={contentUrl} target="_blank" rel="noopener noreferrer">
                <Button>Open PDF in New Tab</Button>
              </a>
            </div>
          </object>
        </div>
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt || '')) {
      return (
        <div className="w-full rounded-lg border p-4 bg-muted">
          <img
            src={contentUrl}
            alt={currentLesson.title}
            className="w-full rounded-lg"
            onContextMenu={(e) => e.preventDefault()}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          />
        </div>
      );
    }

    if (['mp3', 'wav'].includes(fileExt || '')) {
      return (
        <audio controls controlsList="nodownload" className="w-full">
          <source src={contentUrl} type={`audio/${fileExt}`} />
          Your browser does not support audio playback.
        </audio>
      );
    }

    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Content not available for preview.</p>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading course...</div>;
  }

  if (!isEnrolled && !course?.is_free) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-12 px-4 text-center">
          <Lock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-4">Course Access Required</h2>
          <p className="text-muted-foreground mb-6">
            You need to enroll in this course to access the content.
          </p>
          <Button onClick={() => navigate("/explore")}>Browse Courses</Button>
        </div>
      </>
    );
  }

  if (course?.is_free && !isEnrolled) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-12 px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">{course.title}</h2>
          <p className="text-muted-foreground mb-6">{course.description}</p>
          <div className="mb-6">
            <span className="text-3xl font-bold text-green-600">FREE</span>
          </div>
          <Button onClick={handleEnrollFree} size="lg">
            Enroll Now - It's Free!
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content Area */}
          <div className="lg:col-span-2">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>{currentLesson?.title || course?.title}</CardTitle>
                <CardDescription>{course?.category}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderContent()}
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleMarkComplete}
                    disabled={completedLessons.has(currentLesson?.id || '')}
                    className="gap-2"
                  >
                    {completedLessons.has(currentLesson?.id || '') ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Mark as Complete
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {currentLesson && (
              <div className="mb-8 p-6 bg-card rounded-xl shadow-soft mt-6">
                <h1 className="text-2xl font-bold mb-2">{currentLesson.title}</h1>
                {currentLesson.description && (
                  <p className="text-muted-foreground">{currentLesson.description}</p>
                )}

                {/* Lesson Comments Section via Tab or Direct */}
                <LessonComments lessonId={currentLesson.id} />
              </div>
            )}

            {/* Course Tabs: Overview, Discussions */}
            <Tabs defaultValue="overview" className="w-full mt-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-6">
                <div className="prose dark:prose-invert max-w-none">
                  <h3 className="text-xl font-bold mb-4">About this Course</h3>
                  <p>{course.description}</p>
                </div>
              </TabsContent>
              <TabsContent value="community" className="mt-6">
                <DiscussionBoard courseId={course.id} />
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Card className="shadow-soft h-full max-h-[800px] flex flex-col">
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>
                  {modules.reduce((acc, m) => acc + m.lessons.length, 0)} lessons
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto px-2">
                <div className="space-y-2">
                  {modules.map((module, index) => (
                    <div key={module.id} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors text-left"
                      >
                        <span className="font-medium text-sm flex-1">{module.title}</span>
                        {expandedModules.has(module.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {expandedModules.has(module.id) && (
                        <div className="bg-card divide-y">
                          {module.lessons.length === 0 ? (
                            <div className="p-3 text-xs text-muted-foreground text-center">No lessons</div>
                          ) : (
                            module.lessons.map((lesson, lessonIndex) => (
                              <button
                                key={lesson.id}
                                onClick={() => setCurrentLesson(lesson)}
                                className={`w-full text-left p-3 pl-4 transition-colors flex items-start gap-3 ${currentLesson?.id === lesson.id
                                  ? 'bg-primary/10 text-primary border-l-2 border-l-primary'
                                  : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                                  }`}
                              >
                                {completedLessons.has(lesson.id) ? (
                                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500 mt-1" />
                                ) : (
                                  <PlayCircle className="h-4 w-4 flex-shrink-0 mt-1" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-none mb-1">
                                    {lesson.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground opacity-80">
                                    {lesson.content_type || 'Lesson'}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
