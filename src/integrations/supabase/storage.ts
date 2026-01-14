import { supabase } from './client';

/**
 * Generate a signed URL for secure content access
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param expiresIn - Expiration time in seconds (default: 24 hours)
 * @returns Signed URL or null if error
 */
export async function getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 86400 // 24 hours
): Promise<string | null> {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);

        if (error) {
            console.error('Error generating signed URL:', error);
            return null;
        }

        return data.signedUrl;
    } catch (error) {
        console.error('Unexpected error generating signed URL:', error);
        return null;
    }
}

/**
 * Generate multiple signed URLs at once
 * @param bucket - Storage bucket name
 * @param paths - Array of file paths
 * @param expiresIn - Expiration time in seconds
 * @returns Array of signed URLs
 */
export async function getSignedUrls(
    bucket: string,
    paths: string[],
    expiresIn: number = 86400
): Promise<(string | null)[]> {
    return Promise.all(
        paths.map(path => getSignedUrl(bucket, path, expiresIn))
    );
}

/**
 * Upload file with automatic signed URL generation
 * @param bucket - Storage bucket name
 * @param path - Destination path
 * @param file - File to upload
 * @returns Object with path and signed URL
 */
export async function uploadWithSignedUrl(
    bucket: string,
    path: string,
    file: File
): Promise<{ path: string; signedUrl: string | null } | null> {
    try {
        // Upload file
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Error uploading file:', uploadError);
            return null;
        }

        // Generate signed URL
        const signedUrl = await getSignedUrl(bucket, uploadData.path);

        return {
            path: uploadData.path,
            signedUrl,
        };
    } catch (error) {
        console.error('Unexpected error uploading file:', error);
        return null;
    }
}

/**
 * Delete file from storage
 * @param bucket - Storage bucket name
 * @param path - File path to delete
 * @returns Success boolean
 */
export async function deleteFile(
    bucket: string,
    path: string
): Promise<boolean> {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            console.error('Error deleting file:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error deleting file:', error);
        return false;
    }
}

/**
 * Check if user has access to content
 * @param courseId - Course ID
 * @param userId - User ID (optional, uses current user if not provided)
 * @returns Boolean indicating access
 */
export async function checkContentAccess(
    courseId: string,
    userId?: string
): Promise<boolean> {
    try {
        const uid = userId || (await supabase.auth.getUser()).data.user?.id;
        if (!uid) return false;

        // Check if user is enrolled or is the creator
        const { data, error } = await supabase
            .from('enrollments')
            .select('id, courses!inner(creator_id)')
            .eq('course_id', courseId)
            .eq('user_id', uid)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned
            console.error('Error checking access:', error);
        }

        // User has access if enrolled
        if (data) return true;

        // Check if user is the creator
        const { data: courseData } = await supabase
            .from('courses')
            .select('creator_id')
            .eq('id', courseId)
            .single();

        return courseData?.creator_id === uid;
    } catch (error) {
        console.error('Unexpected error checking access:', error);
        return false;
    }
}

/**
 * Get secure video URL with watermark data
 * @param videoPath - Path to video in storage
 * @param courseId - Course ID for access check
 * @returns Object with signed URL and watermark info
 */
export async function getSecureVideoUrl(
    videoPath: string,
    courseId: string
): Promise<{
    url: string | null;
    watermark: {
        text: string;
        position: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
    } | null;
} | null> {
    try {
        // Check access
        const hasAccess = await checkContentAccess(courseId);
        if (!hasAccess) {
            return null;
        }

        // Get user info for watermark
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Generate signed URL
        const signedUrl = await getSignedUrl('course-videos', videoPath);

        return {
            url: signedUrl,
            watermark: {
                text: user.email || 'Protected Content',
                position: 'bottom-right',
            },
        };
    } catch (error) {
        console.error('Error getting secure video URL:', error);
        return null;
    }
}
