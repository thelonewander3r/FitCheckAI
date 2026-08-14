"use client";

import { useEffect, useState, type CSSProperties } from "react";

type TopKind = "silk" | "shirt" | "blazer" | "sweater";
type BottomKind = "trousers" | "skirt" | "wide-leg";

type TopPiece = {
  id: string;
  name: string;
  kind: TopKind;
  color: string;
  accent: string;
};

type BottomPiece = {
  id: string;
  name: string;
  kind: BottomKind;
  color: string;
  accent: string;
};

const TOPS: TopPiece[] = [
  {
    id: "ivory-silk",
    name: "Ivory silk top",
    kind: "silk",
    color: "#f3e9d7",
    accent: "#d5b982",
  },
  {
    id: "sage-shirt",
    name: "Sage button-up",
    kind: "shirt",
    color: "#9cac91",
    accent: "#6e8068",
  },
  {
    id: "navy-blazer",
    name: "Navy blazer",
    kind: "blazer",
    color: "#263d5b",
    accent: "#7f9ab5",
  },
  {
    id: "rose-sweater",
    name: "Rose knit",
    kind: "sweater",
    color: "#c98f91",
    accent: "#8d5c69",
  },
  {
    id: "black-blazer",
    name: "Black blazer",
    kind: "blazer",
    color: "#252832",
    accent: "#7c8291",
  },
];

const BOTTOMS: BottomPiece[] = [
  {
    id: "cream-trouser",
    name: "Cream trousers",
    kind: "trousers",
    color: "#dfd3bd",
    accent: "#a9967a",
  },
  {
    id: "denim-skirt",
    name: "Denim midi skirt",
    kind: "skirt",
    color: "#55728f",
    accent: "#9db2c5",
  },
  {
    id: "charcoal-wide-leg",
    name: "Charcoal wide-leg",
    kind: "wide-leg",
    color: "#454b59",
    accent: "#9299a7",
  },
  {
    id: "olive-skirt",
    name: "Olive wrap skirt",
    kind: "skirt",
    color: "#687758",
    accent: "#aebc86",
  },
  {
    id: "navy-trouser",
    name: "Navy trousers",
    kind: "trousers",
    color: "#2a405b",
    accent: "#8299b4",
  },
];

function GarmentIllustration({
  kind,
  color,
  accent,
}: {
  kind: TopKind | BottomKind;
  color: string;
  accent: string;
}) {
  if (kind === "trousers" || kind === "wide-leg") {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <path
          d={
            kind === "wide-leg"
              ? "M32 18h56l-5 30-8 53H55l-3-44-4 44H23l4-53z"
              : "M38 18h44l-3 37-3 46H55l-4-45-4 45H26l4-46z"
          }
          fill={color}
        />
        <path d="M38 22h44M50 55h20" stroke={accent} strokeWidth="3" opacity=".75" />
        <path d="M28 102h25M71 102h24" stroke="#202837" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "skirt") {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <path d="M42 18h36l3 19 18 58H21l18-58z" fill={color} />
        <path d="M39 38h42M31 75h58M25 94h70" stroke={accent} strokeWidth="3" opacity=".75" />
        <path d="M44 18h32" stroke="#202837" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "blazer") {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <path d="M39 15h42l18 25-11 15-8-8v50H40V47l-8 8-11-15z" fill={color} />
        <path d="M60 17v80M41 46l19-10 19 10" stroke={accent} strokeWidth="3" opacity=".85" />
        <path d="M54 47h12M54 65h12" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "shirt") {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <path d="M42 16h36l17 15 10 19-14 9-8-11v42H37V48l-8 11-14-9 10-19z" fill={color} />
        <path d="M48 17l12 16 12-16M60 33v57M44 50h32" stroke={accent} strokeWidth="3" opacity=".85" />
        <circle cx="60" cy="46" r="2" fill={accent} />
        <circle cx="60" cy="58" r="2" fill={accent} />
      </svg>
    );
  }

  if (kind === "sweater") {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <path d="M43 17h34l17 13 12 25-15 7-8-15v34H37V47l-8 15-15-7 12-25z" fill={color} />
        <path d="M42 28h36M38 48h44M38 61h44M38 74h44" stroke={accent} strokeWidth="3" opacity=".8" />
        <path d="M50 18q10 9 20 0" fill="none" stroke={accent} strokeWidth="4" />
      </svg>
    );
  }

  return null;
}

function PieceTile({
  piece,
  type,
}: {
  piece: TopPiece | BottomPiece;
  type: "top" | "bottom";
}) {
  return (
    <div
      className="wardrobe-piece-tile group relative aspect-square w-[8.25rem] shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-white/75 p-3 shadow-[0_14px_32px_rgba(15,39,68,0.10)] backdrop-blur-sm sm:w-[9.25rem]"
      aria-label={`${type === "top" ? "Top" : "Bottom"}: ${piece.name}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,.96),transparent_48%)]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="mx-auto aspect-square w-[74%] rounded-xl bg-[#f8f3eb] p-2">
          <GarmentIllustration
            kind={piece.kind}
            color={piece.color}
            accent={piece.accent}
          />
        </div>
        <span className="px-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#6b7180]">
          {type === "top" ? "Top" : "Bottom"}
        </span>
      </div>
    </div>
  );
}

function OutfitSilhouette({ top, bottom }: { top: TopPiece; bottom: BottomPiece }) {
  return (
    <svg
      viewBox="0 0 220 300"
      className="h-full w-full"
      role="img"
      aria-label={`Stylized outfit: ${top.name} with ${bottom.name}`}
    >
      <defs>
        <linearGradient id="figure-shadow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".34" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="285" rx="62" ry="8" fill="#21334b" opacity=".12" />
      <circle cx="110" cy="40" r="24" fill="#b87e66" />
      <path d="M86 36q8-34 37-17 10 6 18 22-14-8-55-5z" fill="#302b32" />
      <path d="M99 61h22v15H99z" fill="#b87e66" />
      <path
        d="M70 82q40-25 80 0l16 69-28 12-3-48v50H85v-50l-3 48-28-12z"
        fill={top.color}
      />
      <path d="M84 84l26 25 26-25 9 66H75z" fill="url(#figure-shadow)" opacity=".8" />
      {top.kind === "blazer" && (
        <path d="M110 106v59M92 111l18 16 18-16" stroke={top.accent} strokeWidth="4" />
      )}
      {top.kind === "shirt" && (
        <path d="M98 87l12 16 12-16M110 103v47" stroke={top.accent} strokeWidth="3" />
      )}
      {bottom.kind === "skirt" ? (
        <path d="M79 151h62l27 92H52z" fill={bottom.color} />
      ) : (
        <>
          <path d="M78 151h64l-4 72-8 51h-28l-3-51-5 51H66l8-51z" fill={bottom.color} />
          <path d="M111 157v65" stroke={bottom.accent} strokeWidth="3" opacity=".72" />
        </>
      )}
      <path d="M70 274h27M126 274h28" stroke="#282936" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export function WardrobeTileShowcase() {
  const [lookIndex, setLookIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      setLookIndex((current) => (current + 1) % TOPS.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  const top = TOPS[lookIndex % TOPS.length]!;
  const bottom = BOTTOMS[(lookIndex * 2 + 1) % BOTTOMS.length]!;
  const repeatedTops = [...TOPS, ...TOPS];
  const repeatedBottoms = [...BOTTOMS, ...BOTTOMS];

  return (
    <div
      className="relative mx-auto w-full max-w-[40rem] overflow-hidden rounded-[2rem] border border-[#eadfce] bg-[#eee3d4] p-3 shadow-[0_24px_70px_rgba(68,54,42,0.16)] sm:p-5"
      data-testid="wardrobe-tile-showcase"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,.85),transparent_56%)]" />
      <div className="relative aspect-[4/4.6] overflow-hidden rounded-[1.35rem] border border-white/80 bg-[#e6d9c8]/70">
        <div className="absolute left-4 top-4 z-20 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#53616d] backdrop-blur-sm">
          Build the look
        </div>

        <div className="absolute inset-x-0 top-[13%] overflow-hidden">
          <div className={`wardrobe-rail wardrobe-rail-top ${reducedMotion ? "motion-reduced" : ""}`}>
            {repeatedTops.map((piece, index) => (
              <PieceTile key={`${piece.id}-${index}`} piece={piece} type="top" />
            ))}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-[11%] overflow-hidden">
          <div className={`wardrobe-rail wardrobe-rail-bottom ${reducedMotion ? "motion-reduced" : ""}`}>
            {repeatedBottoms.map((piece, index) => (
              <PieceTile key={`${piece.id}-${index}`} piece={piece} type="bottom" />
            ))}
          </div>
        </div>

        <div className="absolute inset-x-[18%] top-[18%] z-10 flex flex-col items-center rounded-[1.8rem] border border-white/80 bg-[#f9f5ee]/90 px-4 pb-3 pt-5 shadow-[0_18px_42px_rgba(68,54,42,0.18)] backdrop-blur-sm sm:inset-x-[25%] sm:top-[22%]">
          <div className="mb-1 flex w-full items-center justify-between text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#7a7068]">
            <span>Look {String((lookIndex % 4) + 1).padStart(2, "0")}</span>
            <span className="text-[#2a6f7f]">{reducedMotion ? "Still view" : "Recombining"}</span>
          </div>
          <div className="h-[11.5rem] w-full max-w-[11rem] sm:h-[16rem]">
            <OutfitSilhouette top={top} bottom={bottom} />
          </div>
          <div className="w-full border-t border-[#e8ddce] pt-2 text-center">
            <p className="truncate text-xs font-semibold text-[#263d5b]">{top.name}</p>
            <p className="truncate text-xs text-[#7a7068]">with {bottom.name}</p>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-3 left-5 z-30 whitespace-nowrap rounded-full bg-[#263d5b] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white shadow-lg sm:bottom-5 sm:left-7"
        style={{ "--look-index": lookIndex } as CSSProperties}
      >
        Tops move this way →
      </div>
      <div className="pointer-events-none absolute bottom-3 right-5 z-30 whitespace-nowrap rounded-full bg-white/85 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#53616d] shadow-lg sm:bottom-5 sm:right-7">
        ← Bottoms move this way
      </div>
    </div>
  );
}
