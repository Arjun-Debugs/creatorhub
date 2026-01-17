import { useState, useEffect, useCallback } from 'react';
import { getSecureVideoUrl, getSignedUrl, checkContentAccess } from '@/integrations/supabase/storage';

interface SecureContentOptions {
    courseId?: string;
    bucket?: string;
    autoRefresh?: boolean;
    refreshInterval?: number; // in milliseconds
}

interface SecureContentResult {
    url: string | null;
    watermark: {
        text: string;
        position: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
    } | null;
    loading: boolean;
    error: string | null;
    hasAccess: boolean;
    refresh: () => Promise<void>;
}

/**
 * Hook for securely accessing course content with automatic URL refresh
 * @param path - Path to content in storage
 * @param options - Configuration options
 * @returns Secure content URL and metadata
 */
export function useSecureContent(
    path: string | null,
    options: SecureContentOptions = {}
): SecureContentResult {
    const {
        courseId,
        bucket = 'course-videos',
        autoRefresh = true,
        refreshInterval = 20 * 60 * 60 * 1000, // 20 hours (refresh before 24h expiry)
    } = options;

    const [url, setUrl] = useState<string | null>(null);
    const [watermark, setWatermark] = useState<SecureContentResult['watermark']>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasAccess, setHasAccess] = useState(false);

    const fetchSecureUrl = useCallback(async () => {
        if (!path) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Check access first if courseId provided
            if (courseId) {
                const access = await checkContentAccess(courseId);
                setHasAccess(access);

                if (!access) {
                    setError('You do not have access to this content');
                    setUrl(null);
                    setWatermark(null);
                    setLoading(false);
                    return;
                }

                // Get secure video URL with watermark
                const result = await getSecureVideoUrl(path, courseId);
                if (result) {
                    setUrl(result.url);
                    setWatermark(result.watermark);
                } else {
                    setError('Failed to load content');
                }
            } else {
                // Just get signed URL without access check
                const signedUrl = await getSignedUrl(bucket, path);
                setUrl(signedUrl);
                setHasAccess(true);
            }
        } catch (err) {
            console.error('Error fetching secure content:', err);
            setError('An error occurred while loading content');
            setUrl(null);
        } finally {
            setLoading(false);
        }
    }, [path, courseId, bucket]);

    // Initial fetch
    useEffect(() => {
        fetchSecureUrl();
    }, [fetchSecureUrl]);

    // Auto-refresh signed URLs before they expire
    useEffect(() => {
        if (!autoRefresh || !url) return;

        const intervalId = setInterval(() => {
            console.log('Refreshing signed URL...');
            fetchSecureUrl();
        }, refreshInterval);

        return () => clearInterval(intervalId);
    }, [autoRefresh, url, refreshInterval, fetchSecureUrl]);

    return {
        url,
        watermark,
        loading,
        error,
        hasAccess,
        refresh: fetchSecureUrl,
    };
}

/**
 * Hook for securely accessing multiple content items
 * @param paths - Array of paths to content
 * @param bucket - Storage bucket name
 * @returns Array of secure URLs
 */
export function useSecureContentBatch(
    paths: string[],
    bucket: string = 'course-videos'
): {
    urls: (string | null)[];
    loading: boolean;
    error: string | null;
} {
    const [urls, setUrls] = useState<(string | null)[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const joinedPaths = paths.join(',');

    useEffect(() => {
        const fetchUrls = async () => {
            try {
                setLoading(true);
                setError(null);

                const signedUrls = await Promise.all(
                    paths.map(path => getSignedUrl(bucket, path))
                );

                setUrls(signedUrls);
            } catch (err) {
                console.error('Error fetching secure content batch:', err);
                setError('Failed to load content');
            } finally {
                setLoading(false);
            }
        };

        if (paths.length > 0) {
            fetchUrls();
        } else {
            setLoading(false);
        }
    }, [joinedPaths, bucket, paths]);

    return { urls, loading, error };
}
