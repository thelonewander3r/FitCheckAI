"use client";

import { useEffect, useState } from "react";
import {
  tryOnProgressLabel,
  tryOnProgressPercent,
} from "@/lib/client/try-on-progress";

interface Props {
  startedAt: number;
}

export function TryOnProgress({ startedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = now - startedAt;
  const percent = tryOnProgressPercent(elapsed);
  const label = tryOnProgressLabel(elapsed);

  return (
    <div
      className="w-full space-y-2"
      data-testid="try-on-progress"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm font-medium text-[#0f2744]">{label}</p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[#d8e1e5]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-[#2a6f7f] transition-[width] duration-150 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs leading-5 text-[#718096]">
        Usually about 12 seconds.
      </p>
    </div>
  );
}
