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
    category?: string;
    status: 'draft' | 'published';
    is_free: boolean;
    created_at: string;
    updated_at: string;
}

// Extended course with modules and lessons
export interface CourseWithContent extends Course {
    modules: (Module & {
        lessons: Lesson[];
    })[];
}
