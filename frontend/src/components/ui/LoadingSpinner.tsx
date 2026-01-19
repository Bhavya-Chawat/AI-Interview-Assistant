import { Zap } from "lucide-react";
import { cn } from "./cn";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function LoadingSpinner({ size = "xl", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
  }[size];

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  }[size];

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses, className)}>
      {/* Track Circle */}
      <svg
        className="absolute inset-0 w-full h-full transform -rotate-90"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeWidth="6"
          className="text-stone-200 dark:text-surface-700"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="251.2"
          strokeDashoffset="180" // ~25% filled arc
          className="text-primary-500 animate-[spin_1.5s_linear_infinite] origin-center"
        />
      </svg>
      
      {/* Centered Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Zap className={cn("text-primary-500 animate-pulse", iconSizes)} />
      </div>
    </div>
  );
}
