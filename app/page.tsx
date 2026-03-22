"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import Image from "next/image"
import { ArrowRight, GitBranch, MessageSquare, Zap, Users, FileDown, ListChecks, Pin } from "lucide-react"
import TypingText from "@/components/ui/typing-text"

const FloatingLines = dynamic(() => import("@/components/landing/floating-lines"), { ssr: false })
const FlowingMenu = dynamic(() => import("@/components/ui/flowing-menu"), { ssr: false })

const PALETTE = ["#3b2b2e", "#6c3837", "#6b9e83", "#00a38b", "#c2fbef"]

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !started) setStarted(true) },
      { threshold: 0.5 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    let frame: number
    const duration = 1400
    const start = performance.now()
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setCount(Math.round(eased * to))
      if (p < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [started, to])

  return <span ref={ref}>{count}{suffix}</span>
}

const stats = [
  { value: 1, suffix: "", label: "Hub", sub: "for all teamwork", color: "#00a38b" },
  { value: 0, suffix: "", label: "Chaos", sub: "in group projects", color: "#6b9e83", display: "0" },
  { value: 1, suffix: "", label: "Click Reports", sub: "PDF generation", color: "#c2fbef" },
  { value: 100, suffix: "%", label: "Visibility", sub: "into who did what", color: "#6c3837" },
]

const features = [
  { icon: ListChecks, title: "Task Division", desc: "Break projects into tasks and assign them — track progress as work gets done.", color: "#00a38b" },
  { icon: GitBranch, title: "GitHub Sync", desc: "Connect your repo and see commits and contributions per team member.", color: "#6b9e83" },
  { icon: Zap, title: "AI Planning", desc: "Type @AI in chat and get a full project plan with task breakdowns instantly.", color: "#c2fbef" },
  { icon: MessageSquare, title: "Team Chat", desc: "Built-in group chat with @pin, @question, and real-time messaging.", color: "#00a38b" },
  { icon: Users, title: "Instructor Tools", desc: "Teachers create projects, form groups, monitor progress, and answer questions.", color: "#6b9e83" },
  { icon: FileDown, title: "PDF Reports", desc: "One-click professional reports with per-student contribution breakdowns.", color: "#c2fbef" },
]

const tickerItems = [
  "TASK TRACKING", "TEAM CHAT", "AI PLANNING", "PDF REPORTS",
  "GITHUB SYNC", "GROUP MANAGEMENT", "REAL-TIME UPDATES", "INSTRUCTOR Q&A",
  "TASK TRACKING", "TEAM CHAT", "AI PLANNING", "PDF REPORTS",
  "GITHUB SYNC", "GROUP MANAGEMENT", "REAL-TIME UPDATES", "INSTRUCTOR Q&A",
]

export default function LandingPage() {
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0])

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", fontFamily: "var(--font-sans), Inter, system-ui, sans-serif" }}>

      {/* Shader background — fixed */}
      <div className="fixed inset-0 z-0" style={{ opacity: 0.85 }}>
        <FloatingLines
          linesGradient={PALETTE}
          enabledWaves={["top", "middle", "bottom"]}
          lineCount={[4, 6, 3]}
          lineDistance={[8, 5, 6]}
          animationSpeed={0.5}
          interactive
          bendRadius={4}
          bendStrength={-0.4}
          mouseDamping={0.04}
          parallax
          parallaxStrength={0.15}
          mixBlendMode="screen"
        />
      </div>

      {/* ── Nav ── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/colab-logo.png" alt="CoLab" width={44} height={44} className="rounded-lg" />
          <span className="text-xl font-bold tracking-tight text-white">CoLab</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors px-4 py-2">
            Log in
          </Link>
          <Link
            href="/auth/get-started"
            className="text-sm font-bold text-white px-5 py-2.5 transition-all hover:brightness-110"
            style={{ background: "#00a38b", letterSpacing: "0.04em" }}
          >
            GET STARTED
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 overflow-hidden" style={{ minHeight: "100svh", display: "flex", alignItems: "center" }}>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-24 pb-20">
          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-12 items-center">

            {/* Left: text */}
            <motion.div style={{ opacity: heroOpacity }} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
              <div className="flex items-center gap-3 mb-7">
                <div style={{ width: 32, height: 2, background: "#00a38b" }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.28em", color: "#6b9e83" }}>
                  TEAMWORK · SIMPLIFIED
                </span>
              </div>

              <div className="mb-8">
                <TypingText
                  lines={["GROUP", "WORK", "MADE EASY"]}
                  typingSpeed={90}
                  lineDelay={250}
                  outlineLines={[2]}
                  lineClassName="text-white"
                  outlineStyle={{
                    WebkitTextStroke: "1.5px rgba(194,251,239,0.85)",
                    color: "transparent",
                  }}
                  style={{
                    fontSize: "clamp(4.5rem, 12vw, 8rem)",
                    fontWeight: 900,
                    lineHeight: 0.9,
                    letterSpacing: "-0.03em",
                  }}
                />
              </div>

              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.6 }}
                style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "rgba(194,251,239,0.55)", maxWidth: 440, marginBottom: 32 }}
              >
                CoLab is the hub for all your teamwork — divide tasks, chat in real time, track progress, and let AI handle the planning.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58, duration: 0.5 }}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href="/auth/get-started"
                  className="group inline-flex items-center gap-2 text-white transition-all duration-200"
                  style={{
                    fontSize: "0.92rem", fontWeight: 800, letterSpacing: "0.12em", padding: "13px 28px",
                    background: "linear-gradient(135deg, #00a38b, #6b9e83)",
                    boxShadow: "0 0 28px rgba(0,163,139,0.3)",
                  }}
                >
                  GET STARTED FREE
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="#features"
                  className="text-white/50 hover:text-white transition-colors"
                  style={{
                    fontSize: "0.92rem", fontWeight: 700, letterSpacing: "0.12em", padding: "13px 28px",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  SEE FEATURES
                </Link>
              </motion.div>
            </motion.div>

            {/* Right: floating stat chips */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:flex flex-col items-end gap-5 pt-12"
            >
              {[
                { icon: ListChecks, label: "TASK DIVISION", value: "Organized", color: "#00a38b" },
                { icon: MessageSquare, label: "TEAM CHAT", value: "Real-time", color: "#6b9e83" },
                { icon: Pin, label: "PROGRESS", value: "Tracked", color: "#c2fbef" },
              ].map((chip, i) => (
                <motion.div
                  key={chip.label}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5 + i * 0.5, ease: "easeInOut", delay: i * 0.4 }}
                  style={{
                    background: "rgba(10,10,15,0.88)", border: `1px solid ${chip.color}30`,
                    backdropFilter: "blur(12px)", padding: "14px 22px", marginRight: i * 20,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <chip.icon className="w-4 h-4" style={{ color: chip.color }} />
                    <div>
                      <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", color: chip.color }}>
                        {chip.label}
                      </div>
                      <div className="text-white" style={{ fontSize: "1.1rem", fontWeight: 900, lineHeight: 1 }}>
                        {chip.value}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
          style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          <motion.div
            style={{ width: 1, height: 40, background: "linear-gradient(to bottom, rgba(0,163,139,0.7), transparent)" }}
            animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
          <span style={{ fontSize: "0.62rem", letterSpacing: "0.22em", color: "rgba(107,158,131,0.5)" }}>SCROLL</span>
        </motion.div>
      </section>

      {/* ── Ticker ── */}
      <div style={{ background: "#08080d", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", padding: "10px 0" }}>
        <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap">
          {tickerItems.map((item, i) => (
            <span key={i} style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.2em", color: i % 3 === 0 ? "#00a38b" : i % 3 === 1 ? "#6b9e83" : "rgba(255,255,255,0.3)" }}>
              {item}
              <span style={{ color: "rgba(0,163,139,0.35)", margin: "0 24px" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <section className="relative z-10" style={{ background: "#07070c", padding: "60px 0" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex items-center gap-3 mb-10">
            <div style={{ width: 2, height: 24, background: "#00a38b" }} />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.28em", color: "#6b9e83" }}>AT A GLANCE</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                style={{ padding: "28px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : undefined, position: "relative", overflow: "hidden" }}
              >
                <div style={{ position: "absolute", bottom: -10, right: -4, fontSize: "5rem", color: `${s.color}08`, fontWeight: 900 }}>{i + 1}</div>
                <div style={{ fontSize: "clamp(2.8rem, 5vw, 3.8rem)", fontWeight: 900, lineHeight: 1, color: s.color, marginBottom: 4 }}>
                  {s.display ?? <Counter to={s.value} suffix={s.suffix} />}
                </div>
                <div className="text-white" style={{ fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.08em" }}>{s.label}</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(107,158,131,0.6)", marginTop: 2 }}>{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10" style={{ background: "#0a0a0f" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 pb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: 24 }}>
            <div style={{ position: "relative" }}>
              <h2 className="text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.01em", paddingBottom: 10 }}>
                Everything Your Team Needs
              </h2>
              <div style={{ position: "absolute", bottom: 0, left: 0, width: "40%", height: 3, background: "linear-gradient(90deg, #00a38b, transparent)" }} />
            </div>
          </motion.div>
        </div>

        {/* FlowingMenu — full width */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ height: 420, borderTop: "1px solid rgba(0,163,139,0.15)", borderBottom: "1px solid rgba(0,163,139,0.15)" }}
        >
          <FlowingMenu
            items={features.map(f => ({
              link: "#features",
              text: f.title,
              image: "",
            }))}
            speed={12}
            textColor="#c2fbef"
            bgColor="transparent"
            marqueeBgColor="#00a38b"
            marqueeTextColor="#0a0a0f"
            borderColor="rgba(0,163,139,0.15)"
          />
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10" style={{ background: "linear-gradient(125deg, #0f0d18 0%, #0a1210 40%, #0a0a14 100%)", padding: "80px 0" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 500, height: 300, background: "radial-gradient(ellipse, rgba(0,163,139,0.14) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative max-w-7xl mx-auto px-6 sm:px-10">
          <div style={{ maxWidth: 640 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.3em", color: "#6b9e83", marginBottom: 16 }}>GET STARTED</div>
            <h2 className="text-white" style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.02em", marginBottom: 20 }}>
              Ready to<br />
              <span style={{ background: "linear-gradient(135deg, #00a38b, #c2fbef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Collaborate?
              </span>
            </h2>
            <p style={{ fontSize: "1rem", color: "rgba(194,251,239,0.5)", lineHeight: 1.7, marginBottom: 36 }}>
              Stop dreading group projects. CoLab gives your team one place to split tasks, talk in real time, and ship work that everyone can be proud of.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth/get-started"
                className="text-white inline-flex items-center gap-2"
                style={{ fontSize: "0.9rem", fontWeight: 800, letterSpacing: "0.12em", padding: "13px 30px", background: "linear-gradient(135deg, #00a38b, #6b9e83)", boxShadow: "0 0 30px rgba(0,163,139,0.3)" }}
              >
                SIGN UP FREE →
              </Link>
              <Link
                href="/auth/login"
                style={{ fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.12em", padding: "13px 30px", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.6)" }}
              >
                LOG IN
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <div className="relative z-10" style={{ background: "#0a0a0f", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Image src="/colab-logo.png" alt="CoLab" width={36} height={36} className="rounded-md" />
            <span className="text-sm font-medium text-white/70">CoLab</span>
          </div>
          <span style={{ fontSize: "0.7rem", letterSpacing: "0.14em", color: "rgba(107,158,131,0.4)" }}>
            TRUHACKS 2026
          </span>
        </div>
      </div>
    </div>
  )
}
