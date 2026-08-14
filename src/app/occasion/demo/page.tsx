"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function EventDemoPage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    fetch("/api/occasions/demo", { method: "POST" })
      .then((response) => response.json())
      .then((data: { occasionId?: string }) => {
        if (data.occasionId) {
          router.replace(`/occasion/${data.occasionId}`);
        } else {
          router.replace("/occasion");
        }
      })
      .catch(() => router.replace("/occasion"));
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f6f8]">
      <div className="flex h-10 w-10 items-center justify-center">
        <svg
          className="h-8 w-8 animate-spin text-[#2a6f7f]"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
      <p className="font-serif text-base font-medium text-[#0f2744]">
        Preparing event demo…
      </p>
      <p className="text-sm text-[#718096]">
        Setting up a rooftop dinner outfit check.
      </p>
    </div>
  );
}
