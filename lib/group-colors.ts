/**
 * Deterministic color palette for project groups.
 * Each group gets a color by its index (or sort_order).
 * Colors are designed to be distinct, accessible, and work on both light/dark.
 */

export interface GroupColor {
  /** Tailwind-compatible bg class for the dot / chip */
  bg: string
  /** Lighter tinted background for cards / rows */
  bgSubtle: string
  /** Text / icon color */
  text: string
  /** Border color */
  border: string
  /** Raw hex for inline styles (e.g. select option dot) */
  hex: string
}

const PALETTE: GroupColor[] = [
  { bg: "bg-blue-500",    bgSubtle: "bg-blue-500/10",    text: "text-blue-600",    border: "border-blue-300",    hex: "#3b82f6" },
  { bg: "bg-emerald-500", bgSubtle: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-300", hex: "#10b981" },
  { bg: "bg-amber-500",   bgSubtle: "bg-amber-500/10",   text: "text-amber-600",   border: "border-amber-300",   hex: "#f59e0b" },
  { bg: "bg-rose-500",    bgSubtle: "bg-rose-500/10",    text: "text-rose-600",    border: "border-rose-300",    hex: "#f43f5e" },
  { bg: "bg-violet-500",  bgSubtle: "bg-violet-500/10",  text: "text-violet-600",  border: "border-violet-300",  hex: "#8b5cf6" },
  { bg: "bg-cyan-500",    bgSubtle: "bg-cyan-500/10",    text: "text-cyan-600",    border: "border-cyan-300",    hex: "#06b6d4" },
  { bg: "bg-orange-500",  bgSubtle: "bg-orange-500/10",  text: "text-orange-600",  border: "border-orange-300",  hex: "#f97316" },
  { bg: "bg-pink-500",    bgSubtle: "bg-pink-500/10",    text: "text-pink-600",    border: "border-pink-300",    hex: "#ec4899" },
  { bg: "bg-teal-500",    bgSubtle: "bg-teal-500/10",    text: "text-teal-600",    border: "border-teal-300",    hex: "#14b8a6" },
  { bg: "bg-indigo-500",  bgSubtle: "bg-indigo-500/10",  text: "text-indigo-600",  border: "border-indigo-300",  hex: "#6366f1" },
  { bg: "bg-lime-500",    bgSubtle: "bg-lime-500/10",    text: "text-lime-600",    border: "border-lime-300",    hex: "#84cc16" },
  { bg: "bg-fuchsia-500", bgSubtle: "bg-fuchsia-500/10", text: "text-fuchsia-600", border: "border-fuchsia-300", hex: "#d946ef" },
]

export function getGroupColor(index: number): GroupColor {
  return PALETTE[index % PALETTE.length]
}

/** Small colored dot component (inline style for server components) */
export function groupColorDot(index: number, size = 10): React.CSSProperties {
  return {
    display: "inline-block",
    width: size,
    height: size,
    borderRadius: "50%",
    backgroundColor: PALETTE[index % PALETTE.length].hex,
    flexShrink: 0,
  }
}
