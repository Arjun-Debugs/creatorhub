// Markdown utility functions for comment processing

/**
 * Extract @mentions from text
 * Returns array of mentioned usernames
 */
export function extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Replace @mentions with formatted links
 */
export function formatMentions(text: string, users: Array<{ id: string; name: string }>): string {
    let formattedText = text;

    users.forEach(user => {
        const mentionRegex = new RegExp(`@${user.name}\\b`, 'g');
        formattedText = formattedText.replace(
            mentionRegex,
            `[@${user.name}](#user-${user.id})`
        );
    });

    return formattedText;
}

/**
 * Sanitize markdown input to prevent XSS
 */
export function sanitizeMarkdown(text: string): string {
    // Remove potentially dangerous HTML tags
    return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
}

/**
 * Validate markdown content
 */
export function validateMarkdown(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
        return { valid: false, error: 'Comment cannot be empty' };
    }

    if (text.length > 5000) {
        return { valid: false, error: 'Comment is too long (max 5000 characters)' };
    }

    return { valid: true };
}

/**
 * Get markdown toolbar actions
 */
export const markdownActions = [
    { name: 'bold', icon: 'B', prefix: '**', suffix: '**', tooltip: 'Bold' },
    { name: 'italic', icon: 'I', prefix: '*', suffix: '*', tooltip: 'Italic' },
    { name: 'code', icon: '</>', prefix: '`', suffix: '`', tooltip: 'Inline code' },
    { name: 'link', icon: '🔗', prefix: '[', suffix: '](url)', tooltip: 'Link' },
    { name: 'list', icon: '•', prefix: '- ', suffix: '', tooltip: 'Bullet list' },
    { name: 'quote', icon: '❝', prefix: '> ', suffix: '', tooltip: 'Quote' },
];

/**
 * Apply markdown formatting to selected text
 */
export function applyMarkdownFormat(
    text: string,
    selectionStart: number,
    selectionEnd: number,
    prefix: string,
    suffix: string
): { newText: string; newCursorPos: number } {
    const before = text.substring(0, selectionStart);
    const selected = text.substring(selectionStart, selectionEnd);
    const after = text.substring(selectionEnd);

    const newText = `${before}${prefix}${selected}${suffix}${after}`;
    const newCursorPos = selectionStart + prefix.length + selected.length + suffix.length;

    return { newText, newCursorPos };
}
