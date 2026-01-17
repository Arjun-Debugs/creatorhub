import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Send, Bold, Italic, Code, Link, List, Quote } from 'lucide-react';
import { markdownActions, applyMarkdownFormat, validateMarkdown } from '@/lib/markdown';
import MarkdownRenderer from './MarkdownRenderer';

interface User {
    id: string;
    name: string;
    email: string;
}

interface CommentFormProps {
    onSubmit: (content: string) => Promise<void>;
    onCancel?: () => void;
    placeholder?: string;
    initialValue?: string;
    submitLabel?: string;
    enrolledUsers?: User[];
    showPreview?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, any> = {
    'B': Bold,
    'I': Italic,
    '</>': Code,
    '🔗': Link,
    '•': List,
    '❝': Quote,
};

export default function CommentForm({
    onSubmit,
    onCancel,
    placeholder = 'Write a comment... (Markdown supported)',
    initialValue = '',
    submitLabel = 'Post',
    enrolledUsers = [],
    showPreview = true,
}: CommentFormProps) {
    const [content, setContent] = useState(initialValue);
    const [submitting, setSubmitting] = useState(false);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Handle @mention autocomplete
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = content.substring(0, cursorPos);
        const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

        if (lastAtSymbol !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);

            // Check if we're still in a mention (no spaces after @)
            if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
                setMentionQuery(textAfterAt);
                setShowMentions(true);

                // Filter users based on query
                const filtered = enrolledUsers.filter(user =>
                    user.name.toLowerCase().includes(textAfterAt.toLowerCase())
                );
                setFilteredUsers(filtered);
                setSelectedMentionIndex(0); // Reset selection when list changes

                // Calculate position for dropdown
                const coords = getCaretCoordinates(textarea, cursorPos);
                setMentionPosition({ top: coords.top + 20, left: coords.left });
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    }, [content, enrolledUsers]);

    const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
        const div = document.createElement('div');
        const style = getComputedStyle(element);

        Array.from(style).forEach(prop => {
            div.style.setProperty(prop, style.getPropertyValue(prop));
        });

        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.textContent = element.value.substring(0, position);

        document.body.appendChild(div);
        const span = document.createElement('span');
        span.textContent = element.value.substring(position) || '.';
        div.appendChild(span);

        const coordinates = {
            top: span.offsetTop,
            left: span.offsetLeft,
        };

        document.body.removeChild(div);
        return coordinates;
    };

    const insertMention = (user: User) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = content.substring(0, cursorPos);
        const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

        const before = content.substring(0, lastAtSymbol);
        const after = content.substring(cursorPos);

        const newContent = `${before}@${user.name} ${after}`;
        setContent(newContent);
        setShowMentions(false);
        setSelectedMentionIndex(0);

        // Focus back on textarea
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = lastAtSymbol + user.name.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const applyFormat = (prefix: string, suffix: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { newText, newCursorPos } = applyMarkdownFormat(
            content,
            textarea.selectionStart,
            textarea.selectionEnd,
            prefix,
            suffix
        );

        setContent(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleSubmit = async () => {
        const validation = validateMarkdown(content);
        if (!validation.valid) {
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(content);
            setContent('');
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Handle mention dropdown navigation
        if (showMentions && filteredUsers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedMentionIndex(prev =>
                    prev < filteredUsers.length - 1 ? prev + 1 : 0
                );
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedMentionIndex(prev =>
                    prev > 0 ? prev - 1 : filteredUsers.length - 1
                );
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                insertMention(filteredUsers[selectedMentionIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowMentions(false);
                return;
            }
        }

        // Submit on Ctrl/Cmd + Enter
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="space-y-2">
            {showPreview ? (
                <Tabs defaultValue="write" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="write">Write</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="write" className="space-y-2">
                        <div className="flex gap-1 flex-wrap border-b pb-2">
                            {markdownActions.map((action) => {
                                const Icon = iconMap[action.icon] || null;
                                return (
                                    <Button
                                        key={action.name}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => applyFormat(action.prefix, action.suffix)}
                                        title={action.tooltip}
                                        type="button"
                                    >
                                        {Icon ? <Icon className="h-4 w-4" /> : action.icon}
                                    </Button>
                                );
                            })}
                        </div>

                        <div className="relative">
                            <Textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                className="min-h-[100px] font-mono text-sm"
                            />

                            {showMentions && filteredUsers.length > 0 && (
                                <Card
                                    className="absolute z-50 w-64 max-h-48 overflow-y-auto shadow-lg"
                                    style={{ top: mentionPosition.top, left: mentionPosition.left }}
                                >
                                    <div className="p-1">
                                        {filteredUsers.map((user, index) => (
                                            <button
                                                key={user.id}
                                                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${index === selectedMentionIndex
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'hover:bg-muted'
                                                    }`}
                                                onClick={() => insertMention(user)}
                                                onMouseEnter={() => setSelectedMentionIndex(index)}
                                                type="button"
                                            >
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                            </button>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="preview" className="min-h-[100px] border rounded-md p-4">
                        {content ? (
                            <MarkdownRenderer content={content} />
                        ) : (
                            <p className="text-muted-foreground text-sm">Nothing to preview</p>
                        )}
                    </TabsContent>
                </Tabs>
            ) : (
                <div className="space-y-2">
                    <div className="flex gap-1 flex-wrap border-b pb-2">
                        {markdownActions.map((action) => {
                            const Icon = iconMap[action.icon] || null;
                            return (
                                <Button
                                    key={action.name}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => applyFormat(action.prefix, action.suffix)}
                                    title={action.tooltip}
                                    type="button"
                                >
                                    {Icon ? <Icon className="h-4 w-4" /> : action.icon}
                                </Button>
                            );
                        })}
                    </div>

                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="min-h-[80px] font-mono text-sm"
                        />

                        {showMentions && filteredUsers.length > 0 && (
                            <Card
                                className="absolute z-50 w-64 max-h-48 overflow-y-auto shadow-lg"
                                style={{ top: mentionPosition.top, left: mentionPosition.left }}
                            >
                                <div className="p-1">
                                    {filteredUsers.map((user, index) => (
                                        <button
                                            key={user.id}
                                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${index === selectedMentionIndex
                                                ? 'bg-primary/10 text-primary'
                                                : 'hover:bg-muted'
                                                }`}
                                            onClick={() => insertMention(user)}
                                            onMouseEnter={() => setSelectedMentionIndex(index)}
                                            type="button"
                                        >
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                    {content.length}/5000 • Markdown supported • @ to mention
                </span>
                <div className="flex gap-2">
                    {onCancel && (
                        <Button variant="outline" size="sm" onClick={onCancel} type="button">
                            Cancel
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!content.trim() || submitting}
                        type="button"
                    >
                        <Send className="h-3 w-3 mr-1" />
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
