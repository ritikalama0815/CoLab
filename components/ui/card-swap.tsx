"use client"

import {
  Children,
  cloneElement,
  createRef,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"
import gsap from "gsap"
import { cn } from "@/lib/utils"

export interface CardSwapProps {
  width?: number | string
  height?: number | string
  /** How far the front card drops before cycling (px). Keep smaller than the viewport to avoid clipping. */
  dropDistance?: number
  cardDistance?: number
  verticalDistance?: number
  delay?: number
  pauseOnHover?: boolean
  onCardClick?: (idx: number) => void
  /** Fires after each swap with the child index that is now in front (0-based). */
  onCycle?: (frontChildIndex: number) => void
  skewAmount?: number
  easing?: "linear" | "elastic"
  children: ReactNode
  className?: string
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  customClass?: string
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ customClass, className, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={cn(
        "absolute top-1/2 left-1/2 rounded-xl border border-border bg-card text-card-foreground shadow-xl",
        "transform-3d will-change-transform backface-hidden",
        customClass,
        className
      )}
    />
  )
)
Card.displayName = "Card"

interface Slot {
  x: number
  y: number
  z: number
  zIndex: number
}

const makeSlot = (i: number, distX: number, distY: number, total: number): Slot => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
})

const placeNow = (el: HTMLElement, slot: Slot, skew: number) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: "center center",
    zIndex: slot.zIndex,
    force3D: true,
  })

const CardSwap: React.FC<CardSwapProps> = ({
  width = 320,
  height = 280,
  dropDistance = 160,
  cardDistance = 50,
  verticalDistance = 56,
  delay = 4500,
  pauseOnHover = true,
  onCardClick,
  onCycle,
  skewAmount = 5,
  easing = "elastic",
  children,
  className,
}) => {
  const config =
    easing === "elastic"
      ? {
          ease: "elastic.out(0.6,0.9)",
          durDrop: 2,
          durMove: 2,
          durReturn: 2,
          promoteOverlap: 0.9,
          returnDelay: 0.05,
        }
      : {
          ease: "power1.inOut",
          durDrop: 0.8,
          durMove: 0.8,
          durReturn: 0.8,
          promoteOverlap: 0.45,
          returnDelay: 0.2,
        }

  const childArr = useMemo(
    () => Children.toArray(children) as ReactElement<CardProps>[],
    [children]
  )

  const refs = useMemo(
    () => childArr.map(() => createRef<HTMLDivElement>() as RefObject<HTMLDivElement | null>),
    [childArr.length]
  )

  const order = useRef<number[]>([])
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const onCycleRef = useRef(onCycle)
  onCycleRef.current = onCycle

  useEffect(() => {
    const total = refs.length
    if (total === 0) return

    order.current = Array.from({ length: total }, (_, i) => i)
    onCycleRef.current?.(0)

    const runPlacement = () => {
      refs.forEach((r, i) => {
        const el = r.current
        if (!el) return
        placeNow(el, makeSlot(i, cardDistance, verticalDistance, total), skewAmount)
      })
    }

    const raf = requestAnimationFrame(runPlacement)

    if (total < 2) {
      return () => cancelAnimationFrame(raf)
    }

    const swap = () => {
      if (order.current.length < 2) return

      const [front, ...rest] = order.current
      const elFront = refs[front].current
      if (!elFront) return

      const tl = gsap.timeline()
      tlRef.current = tl

      tl.to(elFront, {
        y: `+=${dropDistance}`,
        duration: config.durDrop,
        ease: config.ease,
      })

      tl.addLabel("promote", `-=${config.durDrop * config.promoteOverlap}`)
      rest.forEach((idx, i) => {
        const el = refs[idx].current
        if (!el) return
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length)
        tl.set(el, { zIndex: slot.zIndex }, "promote")
        tl.to(
          el,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            duration: config.durMove,
            ease: config.ease,
          },
          `promote+=${i * 0.15}`
        )
      })

      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length)
      tl.addLabel("return", `promote+=${config.durMove * config.returnDelay}`)
      tl.call(
        () => {
          gsap.set(elFront, { zIndex: backSlot.zIndex })
        },
        undefined,
        "return"
      )
      tl.to(
        elFront,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          duration: config.durReturn,
          ease: config.ease,
        },
        "return"
      )

      tl.call(() => {
        order.current = [...rest, front]
        onCycleRef.current?.(order.current[0] ?? 0)
      })
    }

    const startId = window.setTimeout(() => {
      swap()
      intervalRef.current = setInterval(swap, delay)
    }, 120)

    const node = container.current
    const pause = () => {
      tlRef.current?.pause()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    const resume = () => {
      tlRef.current?.play()
      if (!intervalRef.current) {
        intervalRef.current = setInterval(swap, delay)
      }
    }

    if (pauseOnHover && node) {
      node.addEventListener("mouseenter", pause)
      node.addEventListener("mouseleave", resume)
    }

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(startId)
      if (intervalRef.current) clearInterval(intervalRef.current)
      tlRef.current?.kill()
      if (node && pauseOnHover) {
        node.removeEventListener("mouseenter", pause)
        node.removeEventListener("mouseleave", resume)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs length tracked via childArr.length
  }, [
    childArr.length,
    cardDistance,
    verticalDistance,
    delay,
    pauseOnHover,
    skewAmount,
    easing,
    dropDistance,
  ])

  const rendered = childArr.map((child, i) =>
    isValidElement<CardProps>(child)
      ? cloneElement(child, {
          key: child.key ?? i,
          ref: refs[i],
          style: { width, height, ...(child.props.style ?? {}) },
          onClick: (e: MouseEvent<HTMLDivElement>) => {
            child.props.onClick?.(e)
            onCardClick?.(i)
          },
        } as CardProps & React.RefAttributes<HTMLDivElement>)
      : child
  )

  return (
    <div
      ref={container}
      className={cn("relative mx-auto perspective-[900px] overflow-visible", className)}
      style={{ width, height }}
    >
      {rendered}
    </div>
  )
}

export default CardSwap
