import { useState } from "react";
import { Module, Lesson } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, GripVertical, Pencil, Trash2, ChevronDown, ChevronRight, Video, FileText, Image as ImageIcon, Music, Edit } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ModuleManagerProps {
    courseId: string;
    modules: (Module & { lessons: Lesson[] })[];
    onUpdate: () => void;
    onAddLesson: (moduleId: string) => void;
    onEditLesson: (lesson: Lesson) => void;
    onDeleteLesson: (lessonId: string, contentUrl: string) => void;
}

export default function ModuleManager({
    courseId,
    modules,
    onUpdate,
    onAddLesson,
    onEditLesson,
    onDeleteLesson
}: ModuleManagerProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState("");
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    const toggleExpand = (moduleId: string) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId);
        } else {
            newExpanded.add(moduleId);
        }
        setExpandedModules(newExpanded);
    };

    const handleCreateModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newModuleTitle.trim()) return;

        const { error } = await supabase.from("modules").insert({
            course_id: courseId,
            title: newModuleTitle,
            order_index: modules.length,
        });

        if (error) {
            toast.error("Failed to create module");
        } else {
            toast.success("Module created");
            setNewModuleTitle("");
            setIsCreating(false);
            onUpdate();
        }
    };

    const handleUpdateModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingModule || !editingModule.title.trim()) return;

        const { error } = await supabase
            .from("modules")
            .update({ title: editingModule.title })
            .eq("id", editingModule.id);

        if (error) {
            toast.error("Failed to update module");
        } else {
            toast.success("Module updated");
            setEditingModule(null);
            onUpdate();
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm("Are you sure? This will delete all lessons in this module.")) return;

        const { error } = await supabase.from("modules").delete().eq("id", moduleId);

        if (error) {
            toast.error("Failed to delete module");
        } else {
            toast.success("Module deleted");
            onUpdate();
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'video': return <Video className="h-4 w-4" />;
            case 'pdf': return <FileText className="h-4 w-4" />;
            case 'image': return <ImageIcon className="h-4 w-4" />;
            case 'audio': return <Music className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Modules & Lessons</h3>
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Add Module
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Module</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateModule} className="space-y-4 mt-4">
                            <Input
                                placeholder="Module Title (e.g., Introduction)"
                                value={newModuleTitle}
                                onChange={(e) => setNewModuleTitle(e.target.value)}
                                autoFocus
                            />
                            <Button type="submit" className="w-full">Create Module</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-2">
                {modules.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        No modules yet. Create one to start adding lessons.
                    </div>
                )}

                {modules.map((module, index) => (
                    <Card key={module.id} className="overflow-hidden border-l-4 border-l-primary/20">
                        <div className="p-4 flex items-center gap-3 bg-muted/30">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleExpand(module.id)}
                            >
                                {expandedModules.has(module.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </Button>

                            <div className="flex-1 font-medium flex items-center gap-2">
                                <span className="text-muted-foreground text-sm">Module {index + 1}:</span>
                                {editingModule?.id === module.id ? (
                                    <form onSubmit={handleUpdateModule} className="flex-1 flex gap-2">
                                        <Input
                                            value={editingModule.title}
                                            onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                                            className="h-8"
                                            autoFocus
                                        />
                                        <Button size="sm" type="submit">Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingModule(null)}>Cancel</Button>
                                    </form>
                                ) : (
                                    <span>{module.title}</span>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingModule(module)}>
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteModule(module.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>

                        {expandedModules.has(module.id) && (
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {module.lessons.length === 0 ? (
                                        <div className="p-8 text-center text-sm text-muted-foreground">
                                            No lessons in this module.
                                            <div className="mt-2">
                                                <Button variant="outline" size="sm" onClick={() => onAddLesson(module.id)}>
                                                    <Plus className="h-3 w-3 mr-2" /> Add Lesson
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-card">
                                            {module.lessons.map((lesson, lessonIndex) => (
                                                <div key={lesson.id} className="p-3 pl-12 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                                                    <div className="text-muted-foreground">
                                                        {getIconForType(lesson.content_type || 'video')}
                                                    </div>
                                                    <div className="flex-1 text-sm">
                                                        <span className="font-medium text-muted-foreground mr-2">{lessonIndex + 1}.</span>
                                                        {lesson.title}
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditLesson(lesson)}>
                                                        <Edit className="h-3 w-3 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteLesson(lesson.id, lesson.content_url || '')}>
                                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <div className="p-2 pl-12 border-t">
                                                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => onAddLesson(module.id)}>
                                                    <Plus className="h-3 w-3 mr-2" /> Add Lesson to {module.title}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}
