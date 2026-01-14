import { cn } from "@/lib/utils";

interface VideoWatermarkProps {
    text: string;
    position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
    opacity?: number;
    className?: string;
}

export const VideoWatermark = ({
    text,
    position = 'bottom-right',
    opacity = 0.7,
    className,
}: VideoWatermarkProps) => {
    const positionClasses = {
        'top-right': 'top-4 right-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'top-left': 'top-4 left-4',
    };

    return (
        <div
            className={cn(
                "absolute z-10 pointer-events-none select-none",
                "px-3 py-1.5 rounded-md",
                "bg-black/60 backdrop-blur-sm",
                "text-white text-xs font-medium",
                "shadow-lg",
                positionClasses[position],
                className
            )}
            style={{ opacity }}
        >
            <div className="flex items-center gap-1.5">
                <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                </svg>
                <span>{text}</span>
            </div>
        </div>
    );
};
