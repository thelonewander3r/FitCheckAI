import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0f2744] placeholder:text-[#a0aec0] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a6f7f] focus-visible:ring-offset-0 focus-visible:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
