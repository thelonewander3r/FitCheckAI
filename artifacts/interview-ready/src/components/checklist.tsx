import { cn } from "@/lib/utils";

interface ChecklistProps {
  title: string;
  items: string[];
  className?: string;
}

export function Checklist({ title, items, className }: ChecklistProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-xs uppercase tracking-widest font-medium text-[#0f2744] pb-2 border-b border-[#0f2744]/10">
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex gap-4 items-start group cursor-default">
            <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center border border-[#0f2744]/20 transition-colors group-hover:border-[#0f2744]/50">
              <svg
                className="h-2.5 w-2.5 text-transparent transition-colors group-hover:text-[#0f2744]/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-sm text-[#0f2744]/80 leading-relaxed font-serif transition-colors group-hover:text-[#0f2744]">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
