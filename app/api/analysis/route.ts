import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
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

    const { groupId } = await request.json()

    if (!groupId) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const { data: group } = await supabase
      .from("project_groups")
      .select("id, name, project_id, projects ( name, description, created_by )")
      .eq("id", groupId)
      .single()

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const project = group.projects as { name: string; description: string | null; created_by: string } | null
    if (
      profile?.role !== "instructor" ||
      project?.created_by !== user.id
    ) {
      return NextResponse.json(
        { error: "Only the instructor who created this project can run AI analysis." },
        { status: 403 }
      )
    }

    const { data: scores } = await supabase
      .from("contribution_scores")
      .select(`
        *,
        profiles (
          full_name,
          github_username
        )
      `)
      .eq("group_id", groupId)

    const { data: commits } = await supabase
      .from("commits")
      .select(`
        message,
        additions,
        deletions,
        committed_at,
        author_github_username
      `)
      .eq("group_id", groupId)
      .order("committed_at", { ascending: false })
      .limit(50)

    if (!scores || scores.length === 0) {
      return NextResponse.json(
        {
          error: "No contribution data available. Sync commits first.",
        },
        { status: 400 }
      )
    }

    const contributionSummary = scores.map((s) => {
      const score =
        typeof s.score === "number"
          ? s.score
          : typeof s.total_score === "number"
            ? Number(s.total_score)
            : 0
      return {
        name:
          s.profiles?.full_name || s.profiles?.github_username || "Unknown",
        score,
        commits:
          typeof s.github_commits === "number" ? s.github_commits : 0,
        additions:
          typeof s.github_additions === "number" ? s.github_additions : 0,
        deletions:
          typeof s.github_deletions === "number" ? s.github_deletions : 0,
      }
    })

    const recentCommitSummary =
      commits?.slice(0, 20).map((c) => ({
        author: c.author_github_username,
        message: c.message?.slice(0, 100),
        changes: `+${c.additions}/-${c.deletions}`,
      })) || []

    const prompt = `You are an AI assistant helping analyze group project contributions for a university course. Analyze the following contribution data and provide:

1. A brief overall summary of team contributions (2-3 sentences)
2. Individual member assessments (for each member: their contribution level, strengths, and any concerns)
3. Fairness analysis (is the workload distributed fairly? Any red flags?)
4. Recommendations for the team

Project: ${project?.name || "Group Project"} — ${group?.name || "Group"}
${project?.description ? `Description: ${project.description}` : ""}

Contribution Scores (percentage of total work):
${contributionSummary.map((c) => `- ${c.name}: ${c.score}% (${c.commits} commits, +${c.additions}/-${c.deletions} lines)`).join("\n")}

Recent Commits:
${recentCommitSummary.map((c) => `- ${c.author}: "${c.message}" (${c.changes})`).join("\n")}

Provide your analysis in a clear, professional format suitable for sharing with instructors. Be fair and constructive in your assessment.`

    const result = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      maxOutputTokens: 1500,
    })

    await supabase.from("reports").insert({
      group_id: groupId,
      generated_by: user.id,
      summary: `AI analysis — ${group.name} (${project?.name})`,
      detailed_analysis: {
        kind: "ai_analysis",
        text: result.text,
      },
    })

    return NextResponse.json({
      success: true,
      analysis: result.text,
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate analysis",
      },
      { status: 500 }
    )
  }
}
