import { useState, useEffect } from "react";
import { Module, Lesson } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ModuleEditorProps {
    courseId: string;
    module: Module | null;
    onClose: () => void;
    onSave: () => void;
}

export function ModuleEditor({ courseId, module, onClose, onSave }: ModuleEditorProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (module) {
            setTitle(module.title);
            setDescription(module.description || "");
        } else {
            setTitle("");
            setDescription("");
        }
    }, [module]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Module title is required");
            return;
        }

        setSaving(true);

        try {
            if (module) {
                // Update existing module
                const { error } = await supabase
                    .from("modules")
                    .update({
                        title: title.trim(),
                        description: description.trim() || null,
                    })
                    .eq("id", module.id);

                if (error) throw error;
                toast.success("Module updated successfully");
            } else {
                // Create new module
                // Get current max order_index
                const { data: existingModules } = await supabase
                    .from("modules")
                    .select("order_index")
                    .eq("course_id", courseId)
                    .order("order_index", { ascending: false })
                    .limit(1);

                const nextOrderIndex = existingModules && existingModules.length > 0
                    ? existingModules[0].order_index + 1
                    : 0;

                const { error } = await supabase
                    .from("modules")
                    .insert({
                        course_id: courseId,
                        title: title.trim(),
                        description: description.trim() || null,
                        order_index: nextOrderIndex,
                    });

                if (error) throw error;
                toast.success("Module created successfully");
            }

            onSave();
            onClose();
        } catch (error) {
            console.error("Error saving module:", error);
            toast.error("Failed to save module");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{module ? "Edit Module" : "Create New Module"}</DialogTitle>
                        <DialogDescription>
                            {module
                                ? "Update the module details below."
                                : "Add a new module to organize your course content."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Module Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Introduction to React"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description of what this module covers..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving..." : module ? "Update Module" : "Create Module"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
