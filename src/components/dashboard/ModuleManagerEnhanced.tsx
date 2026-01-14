import { useState, useEffect } from "react";
import { Module, Lesson } from "@/types";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, GripVertical, Pencil, Trash2, ChevronDown, ChevronRight, Video, FileText, Image as ImageIcon, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { ModuleEditor } from "./ModuleEditor";

interface ModuleManagerEnhancedProps {
    courseId: string;
    modules: (Module & { lessons: Lesson[] })[];
    onUpdate: () => void;
    onAddLesson: (moduleId: string) => void;
    onEditLesson: (lesson: Lesson) => void;
    onDeleteLesson: (lessonId: string, contentUrl: string) => void;
}

function SortableModule({
    module,
    index,
    isExpanded,
    onToggle,
    onEdit,
    onDelete,
    onAddLesson,
    onDeleteLesson,
    getIconForType,
}: {
    module: Module & { lessons: Lesson[] };
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAddLesson: () => void;
    onDeleteLesson: (lessonId: string, contentUrl: string) => void;
    getIconForType: (type: string) => JSX.Element;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: module.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className="overflow-hidden border-l-4 border-l-primary/20 mb-2"
        >
            <div className="p-4 flex items-center gap-3 bg-muted/30">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-background rounded transition-colors"
                    title="Drag to reorder"
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onToggle}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </Button>

                <div className="flex-1 font-medium flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Module {index + 1}:</span>
                    <span>{module.title}</span>
                    {module.description && (
                        <span className="text-xs text-muted-foreground ml-2 truncate">
                            {module.description}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <CardContent className="p-0">
                    <div className="divide-y">
                        {module.lessons.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No lessons in this module.
                                <div className="mt-2">
                                    <Button variant="outline" size="sm" onClick={onAddLesson}>
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
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteLesson(lesson.id, lesson.content_url || '')}>
                                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                <div className="p-2 pl-12 border-t">
                                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onAddLesson}>
                                        <Plus className="h-3 w-3 mr-2" /> Add Lesson to {module.title}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

export default function ModuleManagerEnhanced({
    courseId,
    modules: initialModules,
    onUpdate,
    onAddLesson,
    onEditLesson,
    onDeleteLesson
}: ModuleManagerEnhancedProps) {
    const [modules, setModules] = useState(initialModules);
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Update modules when prop changes
    useEffect(() => {
        setModules(initialModules);
    }, [initialModules]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = modules.findIndex((m) => m.id === active.id);
            const newIndex = modules.findIndex((m) => m.id === over.id);

            const newModules = arrayMove(modules, oldIndex, newIndex);
            setModules(newModules);

            // Update order_index in database
            try {
                const updates = newModules.map((module, index) => ({
                    id: module.id,
                    order_index: index,
                }));

                for (const update of updates) {
                    await supabase
                        .from("modules")
                        .update({ order_index: update.order_index })
                        .eq("id", update.id);
                }

                toast.success("Module order updated");
                onUpdate();
            } catch (error) {
                console.error("Error updating module order:", error);
                toast.error("Failed to update module order");
                setModules(initialModules); // Revert on error
            }
        }
    };

    const toggleExpand = (moduleId: string) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId);
        } else {
            newExpanded.add(moduleId);
        }
        setExpandedModules(newExpanded);
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

    const handleSaveModule = () => {
        setEditingModule(null);
        setIsCreating(false);
        onUpdate();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Modules & Lessons</h3>
                    <p className="text-sm text-muted-foreground">Drag modules to reorder them</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsCreating(true)}>
                    <Plus className="h-4 w-4" /> Add Module
                </Button>
            </div>

            <div className="space-y-2">
                {modules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        No modules yet. Create one to start adding lessons.
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={modules.map((m) => m.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {modules.map((module, index) => (
                                <SortableModule
                                    key={module.id}
                                    module={module}
                                    index={index}
                                    isExpanded={expandedModules.has(module.id)}
                                    onToggle={() => toggleExpand(module.id)}
                                    onEdit={() => setEditingModule(module)}
                                    onDelete={() => handleDeleteModule(module.id)}
                                    onAddLesson={() => onAddLesson(module.id)}
                                    onDeleteLesson={onDeleteLesson}
                                    getIconForType={getIconForType}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {(editingModule || isCreating) && (
                <ModuleEditor
                    courseId={courseId}
                    module={editingModule}
                    onClose={() => {
                        setEditingModule(null);
                        setIsCreating(false);
                    }}
                    onSave={handleSaveModule}
                />
            )}
        </div>
    );
}
