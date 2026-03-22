"use client"

import { motion, useReducedMotion } from "framer-motion"

/**
 * Lightweight SVG scene: student at desk with subtle motion (no external assets).
 */
export function StudentStudyingAnimation() {
  const reduce = useReducedMotion()

  const dur = reduce ? 0 : 2.4
  const repeat = reduce ? 0 : Infinity

  return (
    <div
      className="relative mx-auto w-full max-w-md select-none"
      aria-hidden
    >
      <svg
        viewBox="0 0 400 320"
        className="h-auto w-full overflow-visible drop-shadow-[0_20px_40px_oklch(0.45_0.2_300_/_0.2)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="desk" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.55 0.18 300)" />
            <stop offset="100%" stopColor="oklch(0.42 0.2 285)" />
          </linearGradient>
          <linearGradient id="lamp" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.85 0.12 85)" />
            <stop offset="100%" stopColor="oklch(0.7 0.08 75)" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.75 0.2 300 / 0.45)" />
            <stop offset="100%" stopColor="oklch(0.75 0.2 300 / 0)" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <motion.circle
          cx="220"
          cy="140"
          r="120"
          fill="url(#glow)"
          animate={reduce ? undefined : { opacity: [0.5, 0.85, 0.5], scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Desk */}
        <path
          d="M60 220 L340 200 L360 230 L80 252 Z"
          fill="url(#desk)"
          opacity={0.92}
        />
        <rect x="72" y="218" width="296" height="14" rx="4" fill="oklch(0.35 0.08 300)" opacity={0.35} />

        {/* Chair back */}
        <path
          d="M118 210 Q110 150 125 118 Q140 100 158 108 L168 210 Z"
          fill="oklch(0.45 0.06 300)"
          opacity={0.9}
        />

        {/* Body / arm */}
        <path
          d="M175 200 Q165 140 200 118 Q235 105 255 130 L268 195 Q230 205 200 198 Z"
          fill="oklch(0.52 0.14 300)"
        />
        <path
          d="M255 130 Q285 145 295 175 L275 188 Q255 160 240 150 Z"
          fill="oklch(0.48 0.12 280)"
        />

        {/* Head */}
        <circle cx="218" cy="95" r="36" fill="oklch(0.78 0.08 40)" />
        <path
          d="M198 88 Q218 72 242 82 Q248 95 240 108 Q218 118 198 108 Q190 98 198 88"
          fill="oklch(0.25 0.04 300)"
        />

        {/* Book on desk */}
        <motion.g
          animate={reduce ? undefined : { y: [0, -3, 0] }}
          transition={{ duration: dur, repeat, ease: "easeInOut" }}
        >
          <rect x="195" y="188" width="64" height="48" rx="4" fill="oklch(0.95 0.02 300)" />
          <rect x="199" y="192" width="56" height="40" rx="2" fill="oklch(0.88 0.04 310)" />
          <motion.path
            d="M205 200 H250 M205 210 H248 M205 220 H252"
            stroke="oklch(0.45 0.1 300)"
            strokeWidth="2"
            strokeLinecap="round"
            animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.g>

        {/* Laptop */}
        <rect x="115" y="198" width="78" height="48" rx="4" fill="oklch(0.25 0.02 280)" />
        <rect x="120" y="203" width="68" height="32" rx="2" fill="oklch(0.55 0.12 300)" opacity={0.35} />
        <motion.rect
          x="128"
          y="210"
          width="12"
          height="12"
          rx="2"
          fill="oklch(0.7 0.16 300)"
          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.rect
          x="148"
          y="210"
          width="12"
          height="12"
          rx="2"
          fill="oklch(0.65 0.14 310)"
          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.5 }}
        />
        <motion.rect
          x="168"
          y="210"
          width="12"
          height="12"
          rx="2"
          fill="oklch(0.72 0.12 285)"
          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }}
        />

        {/* Desk lamp */}
        <path
          d="M310 248 L318 160 L328 160 L322 248 Z"
          fill="url(#lamp)"
        />
        <ellipse cx="323" cy="158" rx="22" ry="10" fill="oklch(0.9 0.1 90)" />
        <motion.path
          d="M300 158 Q323 120 346 158"
          fill="oklch(0.92 0.08 95 / 0.5)"
          animate={reduce ? undefined : { opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Floating “ideas” */}
        {!reduce && (
          <>
            <motion.circle
              cx="95"
              cy="75"
              r="6"
              fill="oklch(0.65 0.2 300)"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: [0, 1, 0], y: [8, -12, -28] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.circle
              cx="120"
              cy="55"
              r="4"
              fill="oklch(0.7 0.18 310)"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: [0, 1, 0], y: [8, -18, -40] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
            />
            <motion.path
              d="M88 95 Q70 88 62 70"
              stroke="oklch(0.55 0.15 300)"
              strokeWidth="2"
              strokeDasharray="4 6"
              fill="none"
              animate={{ opacity: [0.2, 0.75, 0.2] }}
              transition={{ duration: 3.2, repeat: Infinity }}
            />
          </>
        )}
      </svg>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Students stay focused — FairGroup keeps contributions visible.
      </p>
    </div>
  )
}
