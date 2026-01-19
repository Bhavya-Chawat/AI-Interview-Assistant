import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-500/20 text-primary-600 dark:text-primary-300",
        secondary:
          "border-transparent bg-stone-100 dark:bg-surface-700 text-stone-600 dark:text-surface-300",
        success:
          "border-transparent bg-success-500/20 text-success-600 dark:text-success-400",
        warning:
          "border-transparent bg-secondary-500/20 text-secondary-600 dark:text-secondary-400",
        destructive:
          "border-transparent bg-error-500/20 text-error-600 dark:text-error-400",
        outline:
          "border-stone-300 dark:border-surface-600 text-stone-600 dark:text-surface-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
