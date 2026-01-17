import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Discussion {
    id: string;
    course_id: string;
    user_id: string;
    title: string;
    content: string;
    created_at: string;
    profiles?: {
        name: string;
        avatar_url: string;
    };
    replies_count?: number;
}

interface Reply {
    id: string;
    discussion_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles?: {
        name: string;
        avatar_url: string;
    };
}

export default function DiscussionBoard({ courseId }: { courseId: string }) {
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newReply, setNewReply] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchDiscussions = useCallback(async () => {
        const { data, error } = await supabase
            .from("discussions")
            .select("*, profiles(name, avatar_url)")
            .eq("course_id", courseId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching discussions:", error);
        } else {
            setDiscussions(data || []);
        }
        setLoading(false);
    }, [courseId]);

    const fetchReplies = useCallback(async (discussionId: string) => {
        const { data, error } = await supabase
            .from("discussion_replies")
            .select("*, profiles(name, avatar_url)")
            .eq("discussion_id", discussionId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching replies:", error);
        } else {
            setReplies(data || []);
        }
    }, []); // fetchReplies only depends on supabase and arguments

    useEffect(() => {
        fetchDiscussions();

        // Subscribe to new discussions
        const channel = supabase
            .channel('discussions')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'discussions',
                filter: `course_id=eq.${courseId}`
            }, () => {
                fetchDiscussions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [courseId, fetchDiscussions]);

    useEffect(() => {
        if (activeDiscussion) {
            fetchReplies(activeDiscussion.id);

            // Subscribe to replies
            const channel = supabase
                .channel(`replies:${activeDiscussion.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'discussion_replies',
                    filter: `discussion_id=eq.${activeDiscussion.id}`
                }, () => {
                    fetchReplies(activeDiscussion.id);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [activeDiscussion, fetchReplies]);

    const handleCreateDiscussion = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("discussions").insert({
            course_id: courseId,
            user_id: user.id,
            title: newTitle,
            content: newContent,
        });

        if (error) {
            toast.error("Failed to post discussion");
        } else {
            toast.success("Discussion posted!");
            setNewTitle("");
            setNewContent("");
        }
    };

    const handleCreateReply = async () => {
        if (!newReply.trim() || !activeDiscussion) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("discussion_replies").insert({
            discussion_id: activeDiscussion.id,
            user_id: user.id,
            content: newReply,
        });

        if (error) {
            toast.error("Failed to post reply");
        } else {
            toast.success("Reply posted!");
            setNewReply("");
        }
    };

    if (activeDiscussion) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => setActiveDiscussion(null)} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Discussions
                </Button>

                <Card className="shadow-soft">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-xl mb-2">{activeDiscussion.title}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={activeDiscussion.profiles?.avatar_url} />
                                        <AvatarFallback>{activeDiscussion.profiles?.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{activeDiscussion.profiles?.name}</span>
                                    <span>•</span>
                                    <span>{new Date(activeDiscussion.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-wrap">{activeDiscussion.content}</p>
                    </CardContent>
                </Card>

                <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <h3 className="font-semibold text-lg">Replies</h3>
                    {replies.map((reply) => (
                        <div key={reply.id} className="bg-muted/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={reply.profiles?.avatar_url} />
                                    <AvatarFallback>{reply.profiles?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-foreground">{reply.profiles?.name}</span>
                                <span>•</span>
                                <span>{new Date(reply.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                        </div>
                    ))}

                    <div className="flex gap-4 mt-4">
                        <Textarea
                            placeholder="Write a reply..."
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={handleCreateReply}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Card className="shadow-soft border-primary/20">
                <CardHeader>
                    <CardTitle>Start a Discussion</CardTitle>
                    <CardDescription>Ask a question or share your thoughts with the community.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        placeholder="Topic Title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <Textarea
                        placeholder="What's on your mind?"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                    />
                    <Button onClick={handleCreateDiscussion} className="w-full">
                        Post Discussion
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" /> Recent Discussions
                </h3>

                {loading ? (
                    <p className="text-muted-foreground">Loading...</p>
                ) : discussions.length === 0 ? (
                    <p className="text-muted-foreground">No discussions yet. Be the first to post!</p>
                ) : (
                    discussions.map((discussion) => (
                        <Card
                            key={discussion.id}
                            className="cursor-pointer hover:shadow-md transition-all"
                            onClick={() => setActiveDiscussion(discussion)}
                        >
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold text-lg">{discussion.title}</h4>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            <span>{discussion.profiles?.name}</span>
                                            <span>•</span>
                                            <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon">
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">{discussion.content}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
