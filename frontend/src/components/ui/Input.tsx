import * as React from "react";
import { cn } from "./cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border px-4 py-3 text-sm transition-all duration-200",
          // Light mode
          "bg-white border-stone-200 text-stone-800 placeholder:text-stone-400",
          // Dark mode
          "dark:bg-surface-800 dark:border-surface-600/50 dark:text-white dark:placeholder:text-surface-500",
          // Focus states
          "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
