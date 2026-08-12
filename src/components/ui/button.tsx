import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[#0f2744] text-white hover:bg-[#0a1d35] focus-visible:ring-[#0f2744]":
              variant === "primary",
            "bg-[#2a6f7f] text-white hover:bg-[#235f6e] focus-visible:ring-[#2a6f7f]":
              variant === "secondary",
            "border border-[#0f2744] text-[#0f2744] bg-transparent hover:bg-[#f4f6f8] focus-visible:ring-[#0f2744]":
              variant === "outline",
            "text-[#0f2744] bg-transparent hover:bg-[#f4f6f8] focus-visible:ring-[#0f2744]":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600":
              variant === "danger",
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-11 px-6 text-base": size === "lg",
          },
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
