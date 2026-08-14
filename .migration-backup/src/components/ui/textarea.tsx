import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[90px] w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0f2744] placeholder:text-[#a0aec0] transition-colors resize-y",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a6f7f] focus-visible:ring-offset-0 focus-visible:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
