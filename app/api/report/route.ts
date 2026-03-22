import { createClient } from "@/lib/supabase/server"
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
      .select("*, projects ( name, description, created_by )")
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
        { error: "Only the instructor who created this project can generate reports." },
        { status: 403 }
      )
    }

    const { data: members } = await supabase
      .from("memberships")
      .select(`
        role,
        joined_at,
        profiles (
          full_name,
          github_username
        )
      `)
      .eq("group_id", groupId)

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
      .select("*")
      .eq("group_id", groupId)
      .order("committed_at", { ascending: false })

    const { data: latestReports } = await supabase
      .from("reports")
      .select("detailed_analysis, summary, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(10)

    let aiAnalysis: string | null = null
    if (latestReports) {
      for (const row of latestReports) {
        const da = row.detailed_analysis as
          | { kind?: string; text?: string }
          | null
        if (da?.kind === "ai_analysis" && typeof da.text === "string") {
          aiAnalysis = da.text
          break
        }
      }
    }

    const mapScore = (s: Record<string, unknown>) => {
      const score =
        typeof s.score === "number"
          ? s.score
          : typeof s.total_score === "number"
            ? Number(s.total_score)
            : 0
      return {
        name:
          (s.profiles as { full_name?: string; github_username?: string } | null)
            ?.full_name ||
          (s.profiles as { github_username?: string } | null)?.github_username ||
          "Unknown",
        score,
        commits:
          typeof s.github_commits === "number" ? s.github_commits : 0,
        additions:
          typeof s.github_additions === "number"
            ? s.github_additions
            : 0,
        deletions:
          typeof s.github_deletions === "number"
            ? s.github_deletions
            : 0,
      }
    }

    const reportData = {
      group: {
        name: group?.name,
        projectName: project?.name,
        description: project?.description,
        githubRepo: group?.github_repo_url,
        createdAt: group?.created_at,
      },
      members:
        members?.map((m) => ({
          name: m.profiles?.full_name || "Unknown",
          githubUsername: m.profiles?.github_username,
          role: m.role,
          joinedAt: m.joined_at,
        })) || [],
      contributions:
        scores
          ?.map((s) => mapScore(s as unknown as Record<string, unknown>))
          .sort((a, b) => b.score - a.score) || [],
      commitStats: {
        total: commits?.length || 0,
        totalAdditions:
          commits?.reduce((sum, c) => sum + (c.additions || 0), 0) || 0,
        totalDeletions:
          commits?.reduce((sum, c) => sum + (c.deletions || 0), 0) || 0,
      },
      aiAnalysis,
      generatedAt: new Date().toISOString(),
    }

    // Persist (schema: summary + detailed_analysis JSONB)
    const { error: insertError } = await supabase.from("reports").insert({
      group_id: groupId,
      generated_by: user.id,
      summary: `Contribution report — ${group.name} (${project?.name})`,
      detailed_analysis: {
        kind: "full_report",
        payload: reportData,
        generatedAt: reportData.generatedAt,
      },
    })

    if (insertError) {
      console.error("Report insert:", insertError)
    }

    return NextResponse.json({
      success: true,
      report: reportData,
    })
  } catch (error) {
    console.error("Report generation error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate report",
      },
      { status: 500 }
    )
  }
}
