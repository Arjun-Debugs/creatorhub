import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import { Lesson } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileVideo, FileText, Image as ImageIcon, Music } from "lucide-react";

interface LessonEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    moduleId: string;
    courseId: string;
    lesson?: Lesson | null; // If provided, we're editing
    onSuccess: () => void;
}

export default function LessonEditor({
    open,
    onOpenChange,
    moduleId,
    courseId,
    lesson,
    onSuccess
}: LessonEditorProps) {
    const [title, setTitle] = useState("");
    const [contentType, setContentType] = useState<"video" | "pdf" | "image" | "audio">("video");
    const [contentUrl, setContentUrl] = useState("");
    const [cloudinaryPublicId, setCloudinaryPublicId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (lesson) {
            setTitle(lesson.title);
            setContentType((lesson.content_type as any) || "video");
            setContentUrl(lesson.content_url || "");
            // Extract public_id from Cloudinary URL if exists
            if (lesson.content_url?.includes('cloudinary.com')) {
                const parts = lesson.content_url.split('/');
                const publicIdWithExt = parts[parts.length - 1];
                setCloudinaryPublicId(publicIdWithExt.split('.')[0]);
            }
        } else {
            // Reset for new lesson
            setTitle("");
            setContentType("video");
            setContentUrl("");
            setCloudinaryPublicId("");
        }
    }, [lesson, open]);

    const handleUploadSuccess = (url: string, publicId: string, resourceType: string) => {
        setContentUrl(url);
        setCloudinaryPublicId(publicId);

        // Auto-detect content type from resource type
        if (resourceType === 'video') setContentType('video');
        else if (resourceType === 'image') setContentType('image');
        else if (resourceType === 'raw') {
            if (url.endsWith('.pdf')) setContentType('pdf');
            else setContentType('audio');
        }

        toast.success("File uploaded successfully!");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error("Please enter a lesson title");
            return;
        }

        if (!contentUrl && !lesson) {
            toast.error("Please upload a file");
            return;
        }

        setSaving(true);

        try {
            const lessonData = {
                title,
                content_url: contentUrl,
                content_type: contentType,
                course_id: courseId,
                module_id: moduleId,
            };

            if (lesson) {
                // Update existing lesson
                const { error } = await supabase
                    .from("lessons")
                    .update(lessonData)
                    .eq("id", lesson.id);

                if (error) throw error;
                toast.success("Lesson updated successfully!");
            } else {
                // Create new lesson
                const { error } = await supabase
                    .from("lessons")
                    .insert({
                        ...lessonData,
                        order_index: 0, // Will be adjusted by backend or manually
                    });

                if (error) throw error;
                toast.success("Lesson created successfully!");
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving lesson:", error);
            toast.error("Failed to save lesson");
        } finally {
            setSaving(false);
        }
    };

    const getAcceptedTypes = () => {
        switch (contentType) {
            case 'video': return 'video';
            case 'image': return 'image';
            case 'pdf':
            case 'audio':
                return 'raw';
            default: return 'auto';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{lesson ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Lesson Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Introduction to React Hooks"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contentType">Content Type</Label>
                        <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="video">
                                    <div className="flex items-center gap-2">
                                        <FileVideo className="h-4 w-4" />
                                        Video
                                    </div>
                                </SelectItem>
                                <SelectItem value="pdf">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        PDF Document
                                    </div>
                                </SelectItem>
                                <SelectItem value="image">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        Image
                                    </div>
                                </SelectItem>
                                <SelectItem value="audio">
                                    <div className="flex items-center gap-2">
                                        <Music className="h-4 w-4" />
                                        Audio
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Upload Content</Label>
                        <CloudinaryUpload
                            onUploadSuccess={handleUploadSuccess}
                            acceptedTypes={getAcceptedTypes() as any}
                            buttonText={contentUrl ? "Replace File" : "Upload File"}
                            maxFileSize={200}
                        />
                        {contentUrl && (
                            <p className="text-sm text-muted-foreground">
                                ✓ File uploaded successfully
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 justify-end">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving..." : lesson ? "Update Lesson" : "Create Lesson"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
