import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, placeholder, options, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0f2744] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a6f7f] focus-visible:ring-offset-0 focus-visible:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230f2744' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_0.75rem_center]",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  },
);

Select.displayName = "Select";
