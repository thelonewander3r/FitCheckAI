import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { RankedOutfit } from "@/types/interview";
import type { ApparelTryOnResult } from "@/lib/youcam/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/score-bar";

interface OutfitCardProps {
  outfit: RankedOutfit;
  /** VTO result — accepts both legacy vtoResult and newer tryOnResult keys */
  tryOnResult?: ApparelTryOnResult;
  vtoResult?: ApparelTryOnResult;
  isMockMode?: boolean;
  isSelected?: boolean;
  isLoadingTryOn?: boolean;
  isLoading?: boolean;
  onTryOn?: () => void;
  onSelect?: () => void;
  className?: string;
}

export function OutfitCard({
  outfit,
  tryOnResult,
  vtoResult,
  isMockMode,
  isSelected,
  isLoadingTryOn,
  isLoading,
  onTryOn,
  onSelect,
  className,
}: OutfitCardProps) {
  const [imageError, setImageError] = useState(false);

  const vto = tryOnResult ?? vtoResult;
  const loading = isLoadingTryOn ?? isLoading ?? false;
  const overallScore = outfit.scores.overall;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        className={cn(
          "flex flex-col border-0 rounded-none overflow-hidden transition-all duration-500",
          isSelected ? "bg-white shadow-xl ring-1 ring-[#0f2744]" : "bg-transparent shadow-sm border border-[#0f2744]/10",
          className,
        )}
      >
        {/* Editorial Photo Area */}
        <div className="relative h-[26rem] w-full bg-[#e8e6e1] flex items-center justify-center overflow-hidden">
          {vto?.renderedImageUrl && !imageError ? (
            <motion.img
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8 }}
              src={vto.renderedImageUrl}
              alt={`Virtual try-on: ${outfit.name}`}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-[#0f2744]/40">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-serif italic">{vto ? "Image unavailable" : "Try on to preview"}</span>
            </div>
          )}
          
          {/* Overlay elements */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 text-lg font-serif font-medium text-[#0f2744] flex items-baseline gap-1">
              {overallScore} <span className="text-[10px] uppercase tracking-widest text-[#0f2744]/60 mb-0.5">Score</span>
            </div>
          </div>
          
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            {outfit.colors.map((color) => (
              <Badge key={color} variant="secondary" className="bg-white/90 backdrop-blur-sm border-0 rounded-none text-[#0f2744] text-[10px] uppercase tracking-widest py-1">
                {color}
              </Badge>
            ))}
            {outfit.hasJacket && (
              <Badge variant="default" className="bg-[#0f2744]/90 backdrop-blur-sm border-0 rounded-none text-white text-[10px] uppercase tracking-widest py-1">
                Jacket
              </Badge>
            )}
            {isMockMode && (
              <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-0 rounded-none text-[#0f2744] text-[10px] uppercase tracking-widest py-1">Mock</Badge>
            )}
          </div>
        </div>

        <CardContent className="flex flex-col flex-1 p-6 md:p-8">
          <div className="mb-6">
            <h3 className="font-serif text-3xl font-normal text-[#0f2744] leading-none tracking-tight mb-3">
              {outfit.name}
            </h3>
            <p className="text-sm text-[#0f2744]/70 leading-relaxed font-serif italic">{outfit.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Garments */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] mb-4 border-b border-[#0f2744]/10 pb-2">Wardrobe Pieces</p>
              <ul className="space-y-3">
                {outfit.garments.map((g, i) => (
                  <li key={i} className="text-sm text-[#0f2744] flex items-baseline gap-3">
                    <span className="text-[#2a6f7f] text-xs">/</span>
                    <span className="leading-snug">{g}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Scores */}
            <div className="space-y-4 pt-1">
              <ScoreBar label="Role fit" score={outfit.scores.roleAppropriateness} />
              <ScoreBar label="Format" score={outfit.scores.interviewFormatSuitability} />
              <ScoreBar label="Budget" score={outfit.scores.budgetFit} />
              <ScoreBar label="Camera" score={outfit.scores.cameraReadiness} />
              <ScoreBar label="Versatility" score={outfit.scores.versatility} />
            </div>
          </div>

          <div className="mb-8">
            <p className="text-sm text-[#0f2744]/80 leading-relaxed border-l-2 border-[#2a6f7f] pl-4">{outfit.explanation}</p>
          </div>

          <div className="mt-auto pt-6 border-t border-[#0f2744]/10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744]/60 mb-1">Estimated Cost</p>
              <p className="font-serif text-2xl text-[#0f2744]">${outfit.estimatedPrice.toFixed(0)}</p>
              {outfit.genderNeutralNote && (
                <p className="mt-2 text-[11px] text-[#0f2744]/60 max-w-[200px] leading-tight">{outfit.genderNeutralNote}</p>
              )}
            </div>

            {/* Actions */}
            {(onTryOn ?? onSelect) && (
              <div className="flex flex-col sm:flex-row gap-3">
                {onTryOn && (
                  <button
                    onClick={onTryOn}
                    disabled={loading}
                    className="group relative px-6 py-3 border border-[#0f2744] bg-transparent text-[#0f2744] text-xs font-medium uppercase tracking-widest overflow-hidden transition-colors hover:bg-[#0f2744]/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading
                      </span>
                    ) : vto ? (
                      "Re-try On"
                    ) : (
                      "Virtual Try On"
                    )}
                  </button>
                )}
                {onSelect && (
                  <button
                    onClick={onSelect}
                    className={cn(
                      "px-8 py-3 text-xs font-medium uppercase tracking-widest transition-all duration-300",
                      isSelected 
                        ? "bg-[#2a6f7f] text-white" 
                        : "bg-[#0f2744] text-white hover:bg-[#0a1d35]"
                    )}
                  >
                    {isSelected ? "Selected" : "Select Look"}
                  </button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default OutfitCard;
