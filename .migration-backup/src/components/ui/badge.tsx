import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "accent"
    | "success"
    | "warning"
    | "outline";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-[#0f2744] text-white": variant === "default",
          "bg-[#f4f6f8] text-[#0f2744]": variant === "secondary",
          "bg-[#e8f4f6] text-[#2a6f7f]": variant === "accent",
          "bg-green-50 text-green-700": variant === "success",
          "bg-amber-50 text-amber-700": variant === "warning",
          "border border-[#e2e8f0] text-[#4a5568] bg-transparent":
            variant === "outline",
        },
        className,
      )}
      {...props}
    />
  ),
);

Badge.displayName = "Badge";
