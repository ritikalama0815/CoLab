import { createClient } from "@/lib/supabase/server"
import { getGeminiModel } from "@/lib/gemini"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, userPrompt } = await request.json()

    if (!groupId || !userPrompt) {
      return NextResponse.json(
        { error: "groupId and userPrompt are required" },
        { status: 400 }
      )
    }

    const { data: group } = await supabase
      .from("project_groups")
      .select("id, name, project_id, projects ( name, description )")
      .eq("id", groupId)
      .single()

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const { data: memberRows } = await supabase.rpc(
      "get_group_member_emails",
      { p_group_id: groupId }
    )

    const members = (memberRows || []).map(
      (m: { user_id: string; full_name: string | null }) => m.full_name || "Unknown"
    )

    const project = group.projects as {
      name: string
      description: string | null
    } | null

    const memberList = members.map((n, i) => `${i + 1}. ${n}`).join("\n")

    const systemPrompt = `You are a senior engineering and academic project lead. You produce execution-ready work breakdowns for student teams using current industry and academic best practices.

## Output contract
Respond with ONLY valid JSON. No markdown, no code fences, no commentary before or after the JSON.

## Context
**Team (${members.length} people — use these EXACT full names for assignedTo):**
${memberList}

**Course project:** "${project?.name || "Group Project"}"
**Group name:** "${group.name}"
${project?.description ? `**Project description (from instructor):** ${project.description}` : "**Project description:** (not provided — infer a sensible scope from the student request below.)"}

**What the team asked for:** "${userPrompt}"

## Planning methodology (follow these)
1. **Lifecycle phases (modern product / course delivery):** Order work from discovery → build → verify → handoff. Use **outcome-oriented** phase names (e.g. "Align & scope", "Research & requirements", "Design / architecture", "Implementation", "Integration & QA", "Docs, polish & submission"). Use **3–6 phases** depending on complexity; do not create empty or single-task phases unless the project is tiny.

2. **Tasks must be atomic:** One clear **deliverable** per task. No duplicate or overlapping titles. Each task should be completable by one person in a focused block of time.

3. **Task titles (title field):** Start with a **strong verb** (Draft, Research, Implement, Test, Document, Review, Record, Analyze, Integrate, Peer-review, Present, …). Be specific: include **what** and often **for whom / where** (e.g. "Draft problem statement and success metrics for the course rubric"). **8–16 words** is ideal. Avoid vague words: "stuff", "things", "work on", "handle".

4. **Task instructions (description field):** This is the main clarity requirement. Each description MUST use **exactly these labeled lines** (use the literal labels). Separate lines with \\n in the JSON string:
   - Line starting with **DELIVERABLE:** One concrete artifact (file, section, demo, test report, slide, repo milestone, etc.).
   - Line starting with **DEFINITION OF DONE:** 2–4 short criteria separated by " • " so the team knows when to check the box (measurable where possible).
   - Line starting with **HOW:** 3–5 concrete steps separated by " • " (what to open, what to produce, who to sync with).
   - Line starting with **DEPENDENCIES:** Other tasks, approvals, data, or tools needed — or **None**.
   - Line starting with **EFFORT:** **S** (≤2h), **M** (half day), or **L** (1–2+ days) for one student; add **TIME:** with a rough hour range (e.g. "3–5h").

5. **Assignment & fairness:** Every task has **exactly one** assignee: **assignedTo** must match one of the team names **character-for-character**. **Balance workload:** similar **number of tasks per person** and mix of S/M/L so no one gets all heavy tasks. Match task type to role when the request implies it (e.g. one person owns "test plan", another "implementation").

6. **Priority:** Within each phase, **priority** is execution order: **1** = first, then 2, 3, … No duplicate priorities in the same phase.

7. **Summary (summary field):** Write **3–5 sentences**: goals, sequencing, how quality is ensured (reviews, tests, rubric alignment), and what "done" means for the whole project.

## JSON shape (required keys)
{
  "summary": "string",
  "phases": [
    {
      "name": "string",
      "tasks": [
        {
          "title": "string",
          "description": "string with DELIVERABLE / DEFINITION OF DONE / HOW / DEPENDENCIES / EFFORT lines as specified",
          "assignedTo": "string — exact team member name",
          "priority": 1
        }
      ]
    }
  ]
}`

    const model = getGeminiModel()
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.35,
      },
    })
    const responseText = result.response.text()

    let plan
    try {
      const cleaned = responseText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim()
      plan = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again.", raw: responseText },
        { status: 502 }
      )
    }

    const aiMessageContent = `@ai-plan::${JSON.stringify(plan)}`
    await supabase.from("messages").insert({
      group_id: groupId,
      user_id: user.id,
      content: aiMessageContent,
    })

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error("[AI Plan] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate plan",
      },
      { status: 500 }
    )
  }
}
