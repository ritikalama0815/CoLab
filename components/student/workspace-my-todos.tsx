"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useReducedMotion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Check, Circle, Clock, Layers, ListTodo, Sparkles, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import CardSwap, { Card } from "@/components/ui/card-swap"

interface TodoRow {
  id: string
  group_id: string
  title: string
  description: string | null
  assigned_to: string | null
  phase: string | null
  priority: number
  status: "pending" | "in_progress" | "done"
  color: string | null
  created_by: string | null
  ai_generated: boolean
  created_at: string
  updated_at: string
}

const STATUS_CYCLE: Record<string, "pending" | "in_progress" | "done"> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
}

const STATUS_ICON = {
  pending: Circle,
  in_progress: Clock,
  done: Check,
}

const STATUS_LABEL: Record<string, string> = {
  pending: "To do",
  in_progress: "In progress",
  done: "Done",
}

const MAX_SWAP_CARDS = 8

function sortMine(list: TodoRow[]) {
  return [...list].sort((a, b) => {
    const pa = (a.phase || "").localeCompare(b.phase || "")
    if (pa !== 0) return pa
    return a.priority - b.priority
  })
}

function TodoCardFace({
  todo,
  onToggle,
  compact,
  showFooterHint = true,
}: {
  todo: TodoRow
  onToggle: () => void
  compact?: boolean
  showFooterHint?: boolean
}) {
  const StatusIcon = STATUS_ICON[todo.status]
  const accent = todo.color || "#6366f1"
  const desc = todo.description || ""
  const [expanded, setExpanded] = useState(false)
  const longDesc = desc.length > 220
  const showFull = expanded || !longDesc

  return (
    <div className="flex h-full flex-col p-4 text-left" style={{ borderLeftWidth: 3, borderLeftColor: accent }}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          title={STATUS_LABEL[todo.status]}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all active:scale-95",
            todo.status === "done"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : todo.status === "in_progress"
                ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"
          )}
        >
          <StatusIcon className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {todo.phase && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {todo.phase}
              </span>
            )}
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                todo.status === "done"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : todo.status === "in_progress"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    : "border-border/60 bg-muted/40 text-muted-foreground"
              )}
            >
              {STATUS_LABEL[todo.status]}
            </span>
            {todo.ai_generated && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-500/25 dark:text-violet-300">
                <Sparkles className="h-2.5 w-2.5" />
                AI
              </span>
            )}
          </div>
          <h3
            className={cn(
              "font-bold leading-snug tracking-tight text-foreground",
              compact ? "text-sm line-clamp-3" : "text-[15px] line-clamp-4",
              todo.status === "done" && "text-muted-foreground line-through"
            )}
          >
            {todo.title}
          </h3>
          {desc && (
            <div>
              <p
                className={cn(
                  "text-xs leading-relaxed text-muted-foreground whitespace-pre-line",
                  !showFull && "line-clamp-3"
                )}
              >
                {desc}
              </p>
              {longDesc && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpanded((v) => !v)
                  }}
                  className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
                >
                  {showFull ? "Less" : "More"}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", showFull && "rotate-180")} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {showFooterHint && (
        <p className="mt-auto pt-3 text-[10px] text-muted-foreground">
          Click status to update
          {compact ? " · Hover deck to pause" : ""}
        </p>
      )}
    </div>
  )
}

interface WorkspaceMyTodosProps {
  groupId: string
  userId: string
  initialTodos: TodoRow[]
  portalHref?: string
}

type Filter = "all" | "active" | "done"

export function WorkspaceMyTodos({ groupId, userId, initialTodos, portalHref }: WorkspaceMyTodosProps) {
  const reduceMotion = useReducedMotion()
  const mine = sortMine(
    (initialTodos || []).filter((t) => t.assigned_to === userId)
  )
  const [todos, setTodos] = useState<TodoRow[]>(mine)
  const [filter, setFilter] = useState<Filter>("active")
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({})
  const [deckFrontIdx, setDeckFrontIdx] = useState(0)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    setTodos(
      sortMine((initialTodos || []).filter((t) => t.assigned_to === userId))
    )
  }, [initialTodos, userId])

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`workspace-todos-${groupId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const t = payload.new as TodoRow
            if (t.assigned_to !== userId) return
            setTodos((prev) => {
              if (prev.some((x) => x.id === t.id)) return prev
              return [...prev, t].sort((a, b) => {
                const pa = (a.phase || "").localeCompare(b.phase || "")
                if (pa !== 0) return pa
                return a.priority - b.priority
              })
            })
          } else if (payload.eventType === "UPDATE") {
            const t = payload.new as TodoRow
            if (t.assigned_to !== userId) {
              setTodos((prev) => prev.filter((x) => x.id !== t.id))
              return
            }
            setTodos((prev) => {
              const exists = prev.some((x) => x.id === t.id)
              const next = exists
                ? prev.map((x) => (x.id === t.id ? t : x))
                : [...prev, t]
              return next.sort((a, b) => {
                const pa = (a.phase || "").localeCompare(b.phase || "")
                if (pa !== 0) return pa
                return a.priority - b.priority
              })
            })
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string }
            setTodos((prev) => prev.filter((t) => t.id !== old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, userId])

  const toggleStatus = useCallback(async (todo: TodoRow) => {
    const nextStatus = STATUS_CYCLE[todo.status]
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, status: nextStatus } : t))
    )
    await supabaseRef.current
      .from("todos")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", todo.id)
  }, [])

  const filtered = useMemo(() => {
    if (filter === "active") return todos.filter((t) => t.status !== "done")
    if (filter === "done") return todos.filter((t) => t.status === "done")
    return todos
  }, [todos, filter])

  const swapBatch = useMemo(
    () => filtered.slice(0, MAX_SWAP_CARDS),
    [filtered]
  )
  const overflow = useMemo(
    () => filtered.slice(MAX_SWAP_CARDS),
    [filtered]
  )
  const swapKey = swapBatch.map((t) => t.id).join(",")

  useEffect(() => {
    setDeckFrontIdx(0)
  }, [swapKey])

  const showScrollSection =
    overflow.length > 0 ||
    (swapBatch.length >= 2 && overflow.length === 0 && filtered.length <= MAX_SWAP_CARDS)

  const byPhase = useMemo(() => {
    const phases = Array.from(new Set(overflow.map((t) => t.phase || "General")))
    return phases.map((phase) => ({
      phase,
      items: overflow
        .filter((t) => (t.phase || "General") === phase)
        .sort((a, b) => a.priority - b.priority),
    }))
  }, [overflow])

  const done = todos.filter((t) => t.status === "done").length
  const total = todos.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const activeCount = todos.filter((t) => t.status !== "done").length

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/5 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400">
          <ListTodo className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">Nothing assigned to you</h3>
        <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
          Tasks from an AI plan or your group will land here. Check the Portal to-dos or ask your team to assign work.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 sm:p-5">
      <div className="shrink-0 space-y-5">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Your progress</span>
            <span className="tabular-nums text-muted-foreground">
              {done}/{total} done
              {activeCount > 0 && (
                <span className="ml-2 text-primary">· {activeCount} active</span>
              )}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/30">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "all" as const, label: "All" },
              { id: "active" as const, label: "Active" },
              { id: "done" as const, label: "Done" },
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold transition-all",
                filter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border/50 bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground">
          No tasks in this view — try another filter.
        </p>
      ) : (
        <>
          {/* Full-bleed “stage” — lives outside the scroll region so GSAP isn’t clipped */}
          {swapBatch.length >= 2 && !reduceMotion && (
            <div className="relative -mx-2 shrink-0 overflow-visible sm:-mx-3">
              <div
                role="region"
                aria-label="Rotating task deck"
                className="relative overflow-visible rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.09] via-card/60 to-muted/25 p-4 shadow-[0_28px_56px_-28px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/10 dark:from-primary/[0.12] dark:shadow-[0_28px_56px_-32px_rgba(0,0,0,0.75)] dark:ring-white/5"
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(rgba(128,128,128,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(128,128,128,0.07)_1px,transparent_1px)] bg-[length:22px_22px] opacity-50 dark:bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]"
                  aria-hidden
                />

                <div className="relative mb-1 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/90 shadow-inner ring-1 ring-border/60">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        Focus deck
                      </p>
                      <p className="truncate text-xs font-medium text-foreground">
                        {swapBatch[deckFrontIdx]?.title ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    role="tablist"
                    aria-label="Position in deck"
                  >
                    {swapBatch.map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          i === deckFrontIdx ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/35"
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="relative flex min-h-[min(52vh,380px)] w-full items-center justify-center py-6 sm:min-h-[340px]">
                  <CardSwap
                    key={swapKey}
                    width="100%"
                    height={300}
                    dropDistance={150}
                    cardDistance={40}
                    verticalDistance={44}
                    delay={5200}
                    pauseOnHover
                    easing="elastic"
                    skewAmount={3}
                    onCycle={setDeckFrontIdx}
                    className="w-full max-w-[min(100%,440px)]"
                  >
                    {swapBatch.map((todo) => (
                      <Card
                        key={todo.id}
                        className="cursor-default overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                      >
                        <TodoCardFace
                          todo={todo}
                          onToggle={() => toggleStatus(todo)}
                          compact
                          showFooterHint={false}
                        />
                      </Card>
                    ))}
                  </CardSwap>
                </div>

                <p className="relative text-center text-[10px] text-muted-foreground">
                  Hover anywhere on the deck to pause · motion respects reduced-motion when enabled
                </p>
              </div>
            </div>
          )}

          {swapBatch.length >= 2 && reduceMotion && (
            <div className="relative -mx-2 shrink-0 overflow-visible sm:-mx-3">
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 ring-1 ring-inset ring-border/30">
                <div className="mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Your tasks (reduced motion)
                  </p>
                </div>
                <ul className="space-y-3">
                  {swapBatch.map((todo) => (
                    <li
                      key={todo.id}
                      className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
                    >
                      <TodoCardFace
                        todo={todo}
                        onToggle={() => toggleStatus(todo)}
                        compact
                        showFooterHint={false}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {swapBatch.length === 1 && (
            <div className="relative -mx-2 shrink-0 sm:-mx-3">
              <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.07] via-card/80 to-transparent p-4 ring-1 ring-inset ring-border/40">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    <ListTodo className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      On your desk
                    </p>
                    <p className="text-xs text-muted-foreground">One task in this view — full width</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <TodoCardFace
                    todo={swapBatch[0]}
                    onToggle={() => toggleStatus(swapBatch[0])}
                  />
                </div>
              </div>
            </div>
          )}

          {showScrollSection && (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-0.5">
          {overflow.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                More tasks ({overflow.length})
              </h4>
              <div className="space-y-6">
                {byPhase.map(({ phase, items }) => (
                  <div key={phase}>
                    <h5 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span className="h-px flex-1 bg-border/60" />
                      {phase}
                      <span className="h-px flex-1 bg-border/60" />
                    </h5>
                    <ul className="space-y-2">
                      {items.map((todo) => {
                        const StatusIcon = STATUS_ICON[todo.status]
                        const accent = todo.color || "#6366f1"
                        const desc = todo.description || ""
                        const longDesc = desc.length > 280
                        const showFull = expandedDesc[todo.id] || !longDesc

                        return (
                          <li
                            key={todo.id}
                            className={cn(
                              "overflow-hidden rounded-xl border border-border/50 bg-card/80 shadow-xs",
                              todo.status === "done" && "opacity-[0.88]"
                            )}
                            style={{ borderLeftWidth: 4, borderLeftColor: accent }}
                          >
                            <div className="p-3.5">
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleStatus(todo)}
                                  className={cn(
                                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-all active:scale-95",
                                    todo.status === "done"
                                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
                                      : todo.status === "in_progress"
                                        ? "border-amber-500/50 bg-amber-500/10 text-amber-600"
                                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                                  )}
                                >
                                  <StatusIcon className="h-4 w-4" />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap gap-2">
                                    <span
                                      className={cn(
                                        "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                                        todo.status === "done"
                                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                                          : todo.status === "in_progress"
                                            ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                            : "border-border/60 bg-muted/50 text-muted-foreground"
                                      )}
                                    >
                                      {STATUS_LABEL[todo.status]}
                                    </span>
                                    {todo.ai_generated && (
                                      <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-500/25 dark:text-violet-300">
                                        <Sparkles className="h-2.5 w-2.5" />
                                        AI
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className={cn(
                                      "mt-2 text-sm font-semibold",
                                      todo.status === "done" && "text-muted-foreground line-through"
                                    )}
                                  >
                                    {todo.title}
                                  </p>
                                  {desc && (
                                    <p
                                      className={cn(
                                        "mt-2 max-h-28 overflow-y-auto text-xs leading-relaxed text-muted-foreground whitespace-pre-line",
                                        !showFull && "line-clamp-4"
                                      )}
                                    >
                                      {desc}
                                    </p>
                                  )}
                                  {longDesc && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedDesc((p) => ({
                                          ...p,
                                          [todo.id]: !p[todo.id],
                                        }))
                                      }
                                      className="mt-1 text-[11px] font-semibold text-primary hover:underline"
                                    >
                                      {showFull ? "Show less" : "Show full"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {swapBatch.length >= 2 && overflow.length === 0 && filtered.length <= MAX_SWAP_CARDS && (
            <p className="text-center text-[10px] text-muted-foreground">
              {filtered.length} task{filtered.length === 1 ? "" : "s"} in the deck
            </p>
          )}
          </div>
          )}
        </>
      )}

      {portalHref && (
        <div className="shrink-0 border-t border-border/40 pt-3 text-center">
          <p className="text-[11px] text-muted-foreground">
            Full team list & edits →{" "}
            <a href={portalHref} className="font-semibold text-primary underline-offset-4 hover:underline">
              Portal
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
