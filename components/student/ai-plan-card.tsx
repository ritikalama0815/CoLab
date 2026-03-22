"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  Check,
  Circle,
  RefreshCw,
  Loader2,
  User,
} from "lucide-react"
interface PlanTask {
  title: string
  description?: string
  assignedTo: string
  priority: number
}

interface PlanPhase {
  name: string
  tasks: PlanTask[]
}

interface Plan {
  summary: string
  phases: PlanPhase[]
}

interface AIPlanCardProps {
  plan: Plan
  onConfirm: () => Promise<void>
  onRegenerate: () => void
  confirmed: boolean
}

export function AIPlanCard({
  plan,
  onConfirm,
  onRegenerate,
  confirmed,
}: AIPlanCardProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [confirming, setConfirming] = useState(false)

  const togglePhase = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm()
    } finally {
      setConfirming(false)
    }
  }

  const totalTasks = plan.phases.reduce((sum, p) => sum + p.tasks.length, 0)
  const assignees = Array.from(
    new Set(plan.phases.flatMap((p) => p.tasks.map((t) => t.assignedTo)))
  )

  return (
    <div className="w-full rounded-xl border border-primary/20 bg-linear-to-br from-primary/5 to-primary/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-primary">AI Project Plan</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {totalTasks} tasks · {assignees.length} members
        </span>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 text-xs text-foreground/80 leading-relaxed">
        {plan.summary}
      </div>

      {/* Phases */}
      <div className="px-3 pb-3 space-y-1">
        {plan.phases.map((phase) => (
          <div
            key={phase.name}
            className="rounded-lg border border-border/40 bg-card/50 overflow-hidden"
          >
            <button
              onClick={() => togglePhase(phase.name)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              {expanded[phase.name] ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="flex-1 text-left">{phase.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {phase.tasks.length} tasks
              </span>
            </button>

            {expanded[phase.name] && (
              <div className="border-t border-border/30 px-3 py-2 space-y-1.5">
                {phase.tasks.map((task, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md px-2 py-1.5 bg-background/50"
                  >
                    <Circle className="h-3 w-3 mt-0.5 text-muted-foreground/50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium leading-tight">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-[10px] text-muted-foreground mt-1 max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed pr-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <User className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                        {task.assignedTo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-primary/10 bg-primary/5">
        {confirmed ? (
          <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
            <Check className="h-3.5 w-3.5" />
            Plan confirmed — tasks added to To-Do list
          </div>
        ) : (
          <>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {confirming ? "Creating tasks..." : "Confirm Plan"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={onRegenerate}
              disabled={confirming}
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
