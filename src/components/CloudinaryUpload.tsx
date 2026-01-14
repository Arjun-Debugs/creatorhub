import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileVideo, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CloudinaryUploadProps {
    onUploadSuccess: (url: string, publicId: string, resourceType: string) => void;
    acceptedTypes?: "video" | "image" | "raw" | "auto";
    buttonText?: string;
    maxFileSize?: number; // in MB
}

export default function CloudinaryUpload({
    onUploadSuccess,
    acceptedTypes = "auto",
    buttonText = "Upload File",
    maxFileSize = 100
}: CloudinaryUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    const handleUpload = () => {
        if (!cloudName || !uploadPreset) {
            toast.error("Cloudinary not configured. Please add credentials to .env file.");
            return;
        }

        // Create file input
        const input = document.createElement('input');
        input.type = 'file';

        // Set accepted file types
        if (acceptedTypes === 'video') {
            input.accept = 'video/*';
        } else if (acceptedTypes === 'image') {
            input.accept = 'image/*';
        } else if (acceptedTypes === 'raw') {
            input.accept = '.pdf,.doc,.docx,.csv,.xlsx,.txt';
        }

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            // Check file size
            const fileSizeMB = file.size / (1024 * 1024);
            if (fileSizeMB > maxFileSize) {
                toast.error(`File size exceeds ${maxFileSize}MB limit`);
                return;
            }

            setUploading(true);
            setUploadProgress(0);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);

            // Determine resource type
            let resourceType = 'auto';
            if (file.type.startsWith('video/')) {
                resourceType = 'video';
            } else if (file.type.startsWith('image/')) {
                resourceType = 'image';
            } else {
                resourceType = 'raw';
            }

            try {
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
                    {
                        method: 'POST',
                        body: formData
                    }
                );

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const data = await response.json();

                toast.success("File uploaded successfully!");
                onUploadSuccess(data.secure_url, data.public_id, data.resource_type);
            } catch (error) {
                console.error('Upload error:', error);
                toast.error("Upload failed. Please try again.");
            } finally {
                setUploading(false);
                setUploadProgress(0);
            }
        };

        input.click();
    };

    const getIcon = () => {
        if (acceptedTypes === 'video') return <FileVideo className="h-4 w-4 mr-2" />;
        if (acceptedTypes === 'image') return <ImageIcon className="h-4 w-4 mr-2" />;
        if (acceptedTypes === 'raw') return <FileText className="h-4 w-4 mr-2" />;
        return <Upload className="h-4 w-4 mr-2" />;
    };

    return (
        <div className="space-y-2">
            <Button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                variant="outline"
                className="w-full"
            >
                {uploading ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading... {uploadProgress}%
                    </>
                ) : (
                    <>
                        {getIcon()}
                        {buttonText}
                    </>
                )}
            </Button>

            {uploading && (
                <div className="w-full bg-muted rounded-full h-2">
                    <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                    />
                </div>
            )}
        </div>
    );
}
