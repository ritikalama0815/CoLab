import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/** Keep in sync with components/student/todo-panel.tsx MEMBER_COLORS */
const MEMBER_COLORS = [
  "#4f46e5",
  "#d97706",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#db2777",
]

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, plan } = (await request.json()) as {
      groupId: string
      plan: Plan
    }

    if (!groupId || !plan?.phases) {
      return NextResponse.json(
        { error: "groupId and plan are required" },
        { status: 400 }
      )
    }

    const { data: memberRows } = await supabase.rpc(
      "get_group_member_emails",
      { p_group_id: groupId }
    )

    const members = (memberRows || []) as Array<{
      user_id: string
      full_name: string | null
      email: string | null
    }>

    const nameToUser = new Map<string, { userId: string; color: string }>()
    members.forEach((m, i) => {
      const name = (m.full_name || "").toLowerCase().trim()
      nameToUser.set(name, {
        userId: m.user_id,
        color: MEMBER_COLORS[i % MEMBER_COLORS.length],
      })
    })

    function findMember(assignedTo: string) {
      const key = assignedTo.toLowerCase().trim()
      if (nameToUser.has(key)) return nameToUser.get(key)!

      for (const [name, val] of nameToUser.entries()) {
        if (name.includes(key) || key.includes(name)) return val
      }

      const firstNames = new Map<string, { userId: string; color: string }>()
      for (const [name, val] of nameToUser.entries()) {
        const first = name.split(" ")[0]
        firstNames.set(first, val)
      }
      const assignedFirst = key.split(" ")[0]
      if (firstNames.has(assignedFirst)) return firstNames.get(assignedFirst)!

      return null
    }

    const todosToInsert = plan.phases.flatMap((phase) =>
      phase.tasks.map((task) => {
        const member = findMember(task.assignedTo)
        return {
          group_id: groupId,
          title: task.title,
          description: task.description || null,
          assigned_to: member?.userId || null,
          phase: phase.name,
          priority: task.priority || 0,
          status: "pending" as const,
          color: member?.color || MEMBER_COLORS[0],
          created_by: user.id,
          ai_generated: true,
        }
      })
    )

    if (todosToInsert.length === 0) {
      return NextResponse.json(
        { error: "Plan has no tasks" },
        { status: 400 }
      )
    }

    const { error } = await supabase.from("todos").insert(todosToInsert)

    if (error) {
      console.error("[AI Confirm] Insert error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      todosCreated: todosToInsert.length,
    })
  } catch (error) {
    console.error("[AI Confirm] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to confirm plan",
      },
      { status: 500 }
    )
  }
}
