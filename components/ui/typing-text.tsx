"use client"

import { useEffect, useState, useRef, useCallback } from "react"

interface TypingTextProps {
  lines: string[]
  typingSpeed?: number
  lineDelay?: number
  className?: string
  lineClassName?: string
  outlineLines?: number[]
  outlineStyle?: React.CSSProperties
  style?: React.CSSProperties
}

export default function TypingText({
  lines,
  typingSpeed = 80,
  lineDelay = 200,
  className,
  lineClassName,
  outlineLines = [],
  outlineStyle,
  style,
}: TypingTextProps) {
  const [displayed, setDisplayed] = useState<string[]>(lines.map(() => ""))
  const [currentLine, setCurrentLine] = useState(-1)
  const [currentChar, setCurrentChar] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (visible && currentLine === -1) {
      setCurrentLine(0)
      setCurrentChar(0)
    }
  }, [visible, currentLine])

  useEffect(() => {
    if (currentLine < 0 || currentLine >= lines.length) {
      if (currentLine >= lines.length) {
        const cursorBlink = setInterval(() => setShowCursor(p => !p), 530)
        return () => clearInterval(cursorBlink)
      }
      return
    }

    const line = lines[currentLine]
    if (currentChar <= line.length) {
      const timeout = setTimeout(() => {
        setDisplayed(prev => {
          const next = [...prev]
          next[currentLine] = line.slice(0, currentChar)
          return next
        })
        if (currentChar < line.length) {
          setCurrentChar(c => c + 1)
        } else if (currentLine < lines.length - 1) {
          setTimeout(() => {
            setCurrentLine(l => l + 1)
            setCurrentChar(0)
          }, lineDelay)
        } else {
          setCurrentLine(lines.length)
        }
      }, typingSpeed)
      return () => clearTimeout(timeout)
    }
  }, [currentLine, currentChar, lines, typingSpeed, lineDelay])

  const isOutline = (i: number) => outlineLines.includes(i)
  const activeLine = currentLine < 0 ? 0 : Math.min(currentLine, lines.length - 1)

  return (
    <div ref={ref} className={className} style={style}>
      {displayed.map((text, i) => (
        <div key={i} className={lineClassName} style={isOutline(i) ? outlineStyle : undefined}>
          {text}
          {i === activeLine && (
            <span
              style={{
                display: "inline-block",
                width: "0.06em",
                height: "0.85em",
                background: "#00a38b",
                marginLeft: "0.06em",
                verticalAlign: "baseline",
                opacity: currentLine >= lines.length ? (showCursor ? 1 : 0) : 1,
                transition: "opacity 0.1s",
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
