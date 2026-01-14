import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const LoadingSpinner = ({ className, size = 48, ...props }: LoadingSpinnerProps) => {
  return (
    <div className={cn("flex items-center justify-center min-h-[50vh]", className)} {...props}>
      <Loader2 size={size} className="animate-spin text-primary" />
    </div>
  );
};
