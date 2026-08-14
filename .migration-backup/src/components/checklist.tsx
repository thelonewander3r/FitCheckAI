import { cn } from "@/lib/utils";

interface ChecklistProps {
  title: string;
  items: string[];
  className?: string;
}

export function Checklist({ title, items, className }: ChecklistProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="font-serif text-sm font-semibold text-[#0f2744]">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3 items-start">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-[#e2e8f0] bg-[#f4f6f8]">
              <svg
                className="h-3 w-3 text-[#2a6f7f]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
            <span className="text-sm text-[#4a5568] leading-relaxed">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
