"use client"

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type CSSProperties,
} from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ListTodo,
  Plus,
  Check,
  Circle,
  Clock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
  ChevronsDownUp,
  ChevronsUpDown,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Todo {
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

interface TodoPanelProps {
  groupId: string
  userId: string
  initialTodos: Todo[]
  members: Array<{ userId: string; fullName: string }>
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

const STATUS_LABEL = {
  pending: "To do",
  in_progress: "In progress",
  done: "Done",
}

const STATUS_BADGE = {
  pending: "bg-muted/80 text-muted-foreground border-border/60",
  in_progress:
    "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25",
  done: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border-emerald-500/25",
}

/** Saturated, spaced hues — read clearly on light/dark backgrounds */
const MEMBER_COLORS = [
  "#4f46e5", // indigo
  "#d97706", // amber
  "#059669", // emerald
  "#dc2626", // red
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#ea580c", // orange
  "#db2777", // pink
]

const NONE = "__none__"
const UNASSIGNED_ACCENT = "#64748b" // slate-500 — neutral when no assignee

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace("#", "")
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("")
  }
  if (h.length !== 6) return null
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some((n) => Number.isNaN(n))) return null
  return { r, g, b }
}

/** Tint backgrounds / borders from member color without theme washing it out */
function rgbaFromHex(hex: string, alpha: number) {
  const rgb = parseHex(hex)
  if (!rgb) return `rgba(100, 116, 139, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
  if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase()
  return p[0]?.[0]?.toUpperCase() || "?"
}

type FilterTab = "all" | "mine" | "active" | "done"

export function TodoPanel({ groupId, userId, initialTodos, members }: TodoPanelProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos || [])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newAssignee, setNewAssignee] = useState("")
  const [filter, setFilter] = useState<FilterTab>("all")
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null)
  const supabaseRef = useRef(createClient())

  const memberColorMap = useRef<Record<string, string>>({})
  useEffect(() => {
    const map: Record<string, string> = {}
    members.forEach((m, i) => {
      map[m.userId] = MEMBER_COLORS[i % MEMBER_COLORS.length]
    })
    memberColorMap.current = map
  }, [members])

  const memberNameMap = useRef<Record<string, string>>({})
  useEffect(() => {
    const map: Record<string, string> = {}
    for (const m of members) map[m.userId] = m.fullName
    memberNameMap.current = map
  }, [members])

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`todos-${groupId}`)
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
            const newTodo = payload.new as Todo
            setTodos((prev) => {
              if (prev.some((t) => t.id === newTodo.id)) return prev
              return [...prev, newTodo]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Todo
            setTodos((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            )
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
  }, [groupId])

  const toggleStatus = useCallback(async (todo: Todo) => {
    const nextStatus = STATUS_CYCLE[todo.status]
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, status: nextStatus } : t))
    )
    await supabaseRef.current
      .from("todos")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", todo.id)
  }, [])

  const deleteTodo = useCallback(async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    await supabaseRef.current.from("todos").delete().eq("id", id)
  }, [])

  const reassign = useCallback(async (todoId: string, newUserId: string) => {
    const color = newUserId
      ? memberColorMap.current[newUserId] || MEMBER_COLORS[0]
      : null
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId ? { ...t, assigned_to: newUserId || null, color } : t
      )
    )
    await supabaseRef.current
      .from("todos")
      .update({
        assigned_to: newUserId || null,
        color,
        updated_at: new Date().toISOString(),
      })
      .eq("id", todoId)
  }, [])

  const addTodo = useCallback(async () => {
    if (!newTitle.trim()) return
    const color = newAssignee
      ? memberColorMap.current[newAssignee] || MEMBER_COLORS[0]
      : MEMBER_COLORS[0]

    const { data, error } = await supabaseRef.current
      .from("todos")
      .insert({
        group_id: groupId,
        title: newTitle.trim(),
        assigned_to: newAssignee || null,
        status: "pending",
        color,
        created_by: userId,
        ai_generated: false,
        priority: 0,
      })
      .select()
      .single()

    if (!error && data) {
      setTodos((prev) => [...prev, data])
      setNewTitle("")
      setNewAssignee("")
      setShowAdd(false)
    }
  }, [groupId, userId, newTitle, newAssignee])

  const togglePhase = (phase: string) => {
    setCollapsed((prev) => ({ ...prev, [phase]: !prev[phase] }))
  }

  const safeTodos = todos || []
  const q = search.trim().toLowerCase()

  const filteredByTab = useMemo(() => {
    let list = safeTodos
    if (filter === "mine") {
      list = list.filter((t) => t.assigned_to === userId)
    } else if (filter === "active") {
      list = list.filter((t) => t.status !== "done")
    } else if (filter === "done") {
      list = list.filter((t) => t.status === "done")
    }
    if (q) {
      list = list.filter((t) => {
        const title = t.title.toLowerCase()
        const desc = (t.description || "").toLowerCase()
        return title.includes(q) || desc.includes(q)
      })
    }
    return list
  }, [safeTodos, filter, userId, q])

  const phases = Array.from(
    new Set(filteredByTab.map((t) => t.phase || "General"))
  )
  const grouped = phases.map((phase) => ({
    phase,
    items: filteredByTab
      .filter((t) => (t.phase || "General") === phase)
      .sort((a, b) => a.priority - b.priority),
  }))

  const doneCount = safeTodos.filter((t) => t.status === "done").length
  const totalCount = safeTodos.length
  const progress =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const expandAll = () => setCollapsed({})
  const collapseAll = () => {
    const next: Record<string, boolean> = {}
    for (const p of phases) next[p] = true
    setCollapsed(next)
  }

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "mine", label: "Mine" },
    { id: "active", label: "Active" },
    { id: "done", label: "Done" },
  ]

  return (
    <div
      className="todo-panel-scope flex h-full min-h-0 flex-col bg-linear-to-b from-card/80 to-card/40 text-foreground"
      data-todo-panel
    >
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-card/90 px-3 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                <ListTodo className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight tracking-tight">
                  Tasks
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {totalCount === 0
                    ? "Add or generate with @AI"
                    : `${doneCount} of ${totalCount} complete`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Expand all phases"
              onClick={expandAll}
            >
              <ChevronsDownUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Collapse all phases"
              onClick={collapseAll}
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 px-2.5 text-xs shadow-sm"
              onClick={() => setShowAdd((v) => !v)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Progress */}
        {totalCount > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium tabular-nums text-foreground">
                {progress}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/40">
              <div
                className="h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-3 flex flex-wrap gap-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all",
                filter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="shrink-0 border-b border-border/40 bg-muted/20 px-3 py-3">
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-muted-foreground">
                Title
              </Label>
              <Input
                placeholder="What needs to be done?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-9 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTodo()
                  if (e.key === "Escape") setShowAdd(false)
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-muted-foreground">
                Assignee
              </Label>
              <Select
                value={newAssignee || NONE}
                onValueChange={(v) => setNewAssignee(v === NONE ? "" : v)}
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-0.5">
              <Button
                type="button"
                size="sm"
                className="h-8 flex-1 text-xs"
                onClick={addTodo}
                disabled={!newTitle.trim()}
              >
                Add task
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  setShowAdd(false)
                  setNewTitle("")
                  setNewAssignee("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Todo list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3 pb-4">
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15">
                <ListTodo className="h-6 w-6 opacity-80" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">
                No tasks yet
              </p>
              <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                Type{" "}
                <span className="rounded bg-muted px-1 font-mono text-[10px]">
                  @AI
                </span>{" "}
                in chat to generate a plan, or tap{" "}
                <span className="font-medium text-foreground">Add</span>.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-4 h-8 text-xs"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New task
              </Button>
            </div>
          ) : filteredByTab.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-muted/5 py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                No matches
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                Try another filter or clear search
              </p>
              <Button
                type="button"
                variant="link"
                className="mt-2 h-auto p-0 text-xs"
                onClick={() => {
                  setSearch("")
                  setFilter("all")
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map(({ phase, items }) => (
                <div
                  key={phase}
                  className="overflow-hidden rounded-xl border border-border/50 bg-card/50 shadow-xs ring-1 ring-border/30"
                >
                  <button
                    type="button"
                    onClick={() => togglePhase(phase)}
                    className="flex w-full items-center gap-2 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    {collapsed[phase] ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold tracking-tight">
                      {phase}
                    </span>
                    <Badge
                      variant="secondary"
                      className="h-5 shrink-0 px-1.5 text-[10px] font-normal tabular-nums"
                    >
                      {items.filter((t) => t.status === "done").length}/
                      {items.length}
                    </Badge>
                  </button>

                  {!collapsed[phase] && (
                    <ul className="divide-y divide-border/40">
                      {items.map((todo) => {
                        const StatusIcon = STATUS_ICON[todo.status]
                        const assigneeName = todo.assigned_to
                          ? memberNameMap.current[todo.assigned_to] || "?"
                          : null
                        const accent =
                          todo.color ||
                          (todo.assigned_to
                            ? memberColorMap.current[todo.assigned_to] ||
                              MEMBER_COLORS[0]
                            : UNASSIGNED_ACCENT)

                        const rowStyle: CSSProperties = {
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: rgbaFromHex(accent, 0.55),
                          borderLeftWidth: 4,
                          borderLeftColor: accent,
                          borderLeftStyle: "solid",
                          background: `linear-gradient(105deg, ${rgbaFromHex(accent, 0.24)} 0%, ${rgbaFromHex(accent, 0.09)} 40%, transparent 78%)`,
                        }

                        return (
                          <li
                            key={todo.id}
                            className={cn(
                              "group/item rounded-lg px-2 py-2.5 transition-[box-shadow,transform] hover:shadow-md",
                              todo.status === "done" && "opacity-[0.78]"
                            )}
                            style={rowStyle}
                          >
                            <div className="flex gap-2">
                              {/* Status — keep workflow colors; not tied to member hue */}
                              <button
                                type="button"
                                onClick={() => toggleStatus(todo)}
                                title={`${STATUS_LABEL[todo.status]} — click to advance`}
                                className={cn(
                                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all",
                                  todo.status === "done"
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : todo.status === "in_progress"
                                      ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : "border-slate-400/50 bg-white/95 text-slate-600 shadow-sm hover:border-slate-500 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300"
                                )}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1 pl-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p
                                        className={cn(
                                          "text-xs font-semibold leading-snug tracking-tight text-foreground",
                                          todo.status === "done" &&
                                            "text-muted-foreground line-through decoration-muted-foreground/60"
                                        )}
                                      >
                                        {todo.title}
                                      </p>
                                      {todo.ai_generated && (
                                        <span
                                          className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[9px] font-semibold text-white shadow-sm"
                                          style={{
                                            backgroundColor: rgbaFromHex(
                                              "#7c3aed",
                                              0.9
                                            ),
                                            boxShadow: `0 0 0 1px ${rgbaFromHex("#7c3aed", 0.5)}`,
                                          }}
                                          title="Created from an AI plan"
                                        >
                                          <Sparkles className="h-2.5 w-2.5" />
                                          AI
                                        </span>
                                      )}
                                    </div>
                                    {todo.description && (
                                      <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-line text-[10px] leading-relaxed text-muted-foreground">
                                        {todo.description}
                                      </p>
                                    )}
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                                    title="Delete task"
                                    onClick={() => setDeleteTarget(todo)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-md border px-1.5 py-0 text-[9px] font-semibold",
                                      STATUS_BADGE[todo.status]
                                    )}
                                  >
                                    {STATUS_LABEL[todo.status]}
                                  </span>

                                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                    {assigneeName ? (
                                      <div
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                        style={{
                                          backgroundColor: accent,
                                          boxShadow: `
                                            0 0 0 2px var(--card),
                                            0 0 0 4px ${accent},
                                            0 2px 8px ${rgbaFromHex(accent, 0.55)}
                                          `,
                                        }}
                                        title={assigneeName}
                                      >
                                        {initials(assigneeName)}
                                      </div>
                                    ) : (
                                      <div
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-400/50 bg-slate-100 text-slate-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                        title="Unassigned"
                                      >
                                        <User className="h-3 w-3" />
                                      </div>
                                    )}
                                    <Select
                                      value={todo.assigned_to || NONE}
                                      onValueChange={(v) =>
                                        reassign(
                                          todo.id,
                                          v === NONE ? "" : v
                                        )
                                      }
                                    >
                                      <SelectTrigger
                                        className={cn(
                                          "h-8 min-w-0 flex-1 rounded-md border text-[10px] font-medium shadow-none [&_svg]:h-3 [&_svg]:w-3",
                                          !assigneeName && "text-muted-foreground"
                                        )}
                                        style={{
                                          borderColor: rgbaFromHex(
                                            accent,
                                            assigneeName ? 0.55 : 0.28
                                          ),
                                          backgroundColor: rgbaFromHex(
                                            accent,
                                            assigneeName ? 0.16 : 0.05
                                          ),
                                          ...(assigneeName
                                            ? { color: accent }
                                            : {}),
                                        }}
                                      >
                                        <SelectValue
                                          placeholder="Assign"
                                          className="truncate"
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={NONE}>
                                          Unassigned
                                        </SelectItem>
                                        {members.map((m) => (
                                          <SelectItem
                                            key={m.userId}
                                            value={m.userId}
                                          >
                                            <span className="flex items-center gap-2">
                                              <span
                                                className="h-2 w-2 shrink-0 rounded-full"
                                                style={{
                                                  backgroundColor:
                                                    memberColorMap.current[
                                                      m.userId
                                                    ] || MEMBER_COLORS[0],
                                                }}
                                              />
                                              {m.fullName}
                                            </span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.title.slice(0, 80)}${deleteTarget.title.length > 80 ? "…" : ""}" will be removed for everyone in the group.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) void deleteTodo(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
