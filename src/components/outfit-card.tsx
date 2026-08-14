"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RankedOutfit } from "@/types/interview";
import type { ApparelTryOnResult } from "@/lib/youcam/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/score-bar";

interface OutfitCardProps {
  outfit: RankedOutfit;
  vtoResult?: ApparelTryOnResult;
  isMockMode?: boolean;
  isSelected?: boolean;
  isLoading?: boolean;
  onTryOn?: () => void;
  onSelect?: () => void;
  className?: string;
}

export function OutfitCard({
  outfit,
  vtoResult,
  isMockMode,
  isSelected,
  isLoading,
  onTryOn,
  onSelect,
  className,
}: OutfitCardProps) {
  const [imageError, setImageError] = useState(false);

  const overallScore = outfit.scores.overall;

  return (
    <Card
      className={cn(
        "flex flex-col transition-shadow",
        isSelected && "ring-2 ring-[#2a6f7f]",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{outfit.name}</CardTitle>
          <span className="flex-shrink-0 text-xl font-bold text-[#2a6f7f]">
            {overallScore}
            <span className="text-xs font-normal text-[#718096]">/100</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {outfit.colors.map((color) => (
            <Badge key={color} variant="secondary" className="capitalize">
              {color}
            </Badge>
          ))}
          {outfit.hasJacket && (
            <Badge variant="accent">Jacket included</Badge>
          )}
          {isMockMode && (
            <Badge variant="outline" className="text-[10px]">
              Mock mode
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        {/* VTO image or placeholder */}
        <div className="relative h-48 w-full rounded-lg overflow-hidden bg-[#f4f6f8] flex items-center justify-center">
          {vtoResult?.renderedImageUrl && !imageError ? (
            // Mock VTO returns a data URL and live VTO returns an app-owned
            // proxy path; a native image element supports both forms.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vtoResult.renderedImageUrl}
              alt={`Virtual try-on: ${outfit.name}`}
              data-testid="try-on-image"
              className="h-full w-full object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#718096]">
              <svg
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-xs">
                {vtoResult ? "Preview unavailable" : "Try on to preview"}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-[#4a5568] leading-relaxed">
          {outfit.description}
        </p>

        {/* Garments */}
        <div>
          <p className="text-xs font-semibold text-[#0f2744] mb-1.5">
            Includes
          </p>
          <ul className="space-y-1">
            {outfit.garments.map((g, i) => (
              <li key={i} className="flex gap-2 text-xs text-[#4a5568]">
                <span className="text-[#2a6f7f] mt-px">•</span>
                {g}
              </li>
            ))}
          </ul>
        </div>

        {/* Scores */}
        <div className="space-y-2">
          <ScoreBar
            label="Role fit"
            score={outfit.scores.roleAppropriateness}
          />
          <ScoreBar
            label="Event fit"
            score={outfit.scores.interviewFormatSuitability}
          />
          <ScoreBar
            label="Camera readiness"
            score={outfit.scores.cameraReadiness}
          />
          <ScoreBar label="Versatility" score={outfit.scores.versatility} />
        </div>

        <p className="text-xs text-[#718096] italic">{outfit.explanation}</p>

        <div className="mt-auto pt-2">
          {outfit.genderNeutralNote && (
            <p className="text-[10px] text-[#718096] italic">
              {outfit.genderNeutralNote}
            </p>
          )}
        </div>

        {/* Actions */}
        {(onTryOn ?? onSelect) && (
          <div className="flex gap-2 mt-2">
            {onTryOn && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTryOn}
                disabled={isLoading}
                className="flex-1 text-xs"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
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
                    Loading…
                  </>
                ) : vtoResult ? (
                  "Re-try On"
                ) : (
                  "Virtual Try On"
                )}
              </Button>
            )}
            {onSelect && (
              <Button
                variant={isSelected ? "secondary" : "primary"}
                size="sm"
                onClick={onSelect}
                className="flex-1 text-xs"
              >
                {isSelected ? "✓ Selected" : "Select"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
