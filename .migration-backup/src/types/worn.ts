import type { WardrobeCategory, WardrobeColor, WardrobeFormality } from "./wardrobe"
import type { OccasionType } from "./occasion"

export interface WornItemRef {
  id: string
  name: string
  category: WardrobeCategory
  color: WardrobeColor
  formality: WardrobeFormality
}

export interface WornOutfitRecord {
  id: string
  occasionId?: string
  eventType?: OccasionType | "general"
  wornDate: string // ISO date (YYYY-MM-DD)
  rating?: "loved" | "liked" | "meh"
  items: WornItemRef[]
  createdAt: string
}

export interface StyleProfile {
  colors: { color: WardrobeColor; count: number }[] // top 3 by count
  categories: { category: WardrobeCategory; count: number }[] // top 2 by count
  formality: number // rounded mean of item formality levels (0..4), or -1 when no data
  totalWorn: number
}
