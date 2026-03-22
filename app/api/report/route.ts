import { createClient } from "@/lib/supabase/server"
import { getGeminiModel } from "@/lib/gemini"
import { aggregateContributions, parseGeminiJson } from "@/lib/report-helpers"
import { NextRequest, NextResponse } from "next/server"

type GeminiReport = {
  overview: string
  memberGrades: {
    name: string
    suggestedGrade: string
    scoreOutOf100: number
    justification: string
  }[]
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

    const project = group.projects as {
      name: string
      description: string | null
      created_by: string
    } | null
    if (
      profile?.role !== "instructor" ||
      project?.created_by !== user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Only the instructor who created this project can generate reports.",
        },
        { status: 403 }
      )
    }

    const { data: memberships } = await supabase
      .from("memberships")
      .select(
        `
        user_id,
        role,
        joined_at,
        profiles (
          full_name,
          github_username
        )
      `
      )
      .eq("group_id", groupId)

    const { data: scores } = await supabase
      .from("contribution_scores")
      .select(
        `
        *,
        profiles (
          full_name,
          github_username
        )
      `
      )
      .eq("group_id", groupId)

    const { data: commits } = await supabase
      .from("commits")
      .select("*")
      .eq("group_id", groupId)
      .order("committed_at", { ascending: false })

    const { data: docsRows, error: docsErr } = await supabase
      .from("docs_activity")
      .select("*")
      .eq("group_id", groupId)

    if (docsErr) {
      console.warn(
        "docs_activity (run scripts/add_docs_activity_and_storage.sql if missing):",
        docsErr.message
      )
    }

    const memberRows =
      memberships?.map((m) => ({
        user_id: m.user_id,
        profiles: m.profiles as {
          full_name: string | null
          github_username: string | null
        } | null,
      })) || []

    const seen = new Set(memberRows.map((m) => m.user_id))
    for (const c of commits || []) {
      if (!c.author_id || seen.has(c.author_id)) continue
      seen.add(c.author_id)
      memberRows.push({
        user_id: c.author_id,
        profiles: {
          full_name:
            (c.author_github_username as string | null) ||
            (c.github_username as string | null) ||
            "GitHub contributor",
          github_username: (c.github_username as string | null) || null,
        },
      })
    }

    const safeDocs =
      !docsErr && docsRows
        ? docsRows.map((d) => ({
            user_id: d.user_id as string,
            minutes_spent: d.minutes_spent as number | null,
            lines_added: d.lines_added as number | null,
            lines_removed: d.lines_removed as number | null,
          }))
        : []

    const memberBreakdown = aggregateContributions(
      memberRows,
      (commits || []).map((c) => ({
        author_id: c.author_id as string | null,
        additions: c.additions as number | null,
        deletions: c.deletions as number | null,
      })),
      safeDocs
    )

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
          typeof s.github_additions === "number" ? s.github_additions : 0,
        deletions:
          typeof s.github_deletions === "number" ? s.github_deletions : 0,
      }
    }

    const contributionList =
      scores
        ?.map((s) => mapScore(s as unknown as Record<string, unknown>))
        .sort((a, b) => b.score - a.score) || []

    let gemini: GeminiReport | null = null
    try {
      const model = getGeminiModel()
      const payload = {
        project: project?.name,
        group: group.name,
        projectDescription: project?.description,
        members: memberBreakdown.map((m) => ({
          name: m.name,
          github: {
            commits: m.commits,
            linesAdded: m.githubAdditions,
            linesRemoved: m.githubDeletions,
            estimatedSharePercent: m.githubPct,
          },
          googleWorkspace: {
            minutesSpent: m.docsMinutes,
            linesAdded: m.docsLinesAdded,
            linesRemoved: m.docsLinesRemoved,
            estimatedSharePercent: m.docsPct,
          },
        })),
      }

      const prompt = `You are an assistant for a university instructor evaluating a group project.

Use ONLY the quantitative data below. Be fair and concise. Grades are suggestions for discussion, not final marks.

Data:
${JSON.stringify(payload, null, 2)}

Respond with ONLY valid JSON (no markdown fences) in this exact shape:
{
  "overview": "3-5 sentences summarizing collaboration, code vs writing balance, and fairness.",
  "memberGrades": [
    {
      "name": "exact student name from data",
      "suggestedGrade": "letter like A, B+, B, C+, etc.",
      "scoreOutOf100": 85,
      "justification": "1-3 sentences referencing GitHub activity and Google Docs/Slides-style work (minutes and line edits)."
    }
  ]
}

Include one memberGrades entry for every member in the data. If someone has little data, say so in the justification and grade conservatively.`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = parseGeminiJson<GeminiReport>(text)
      if (
        parsed &&
        typeof parsed.overview === "string" &&
        Array.isArray(parsed.memberGrades)
      ) {
        gemini = parsed
      }
    } catch (e) {
      console.error("Gemini report:", e)
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
        memberships?.map((m) => ({
          name:
            (m.profiles as { full_name?: string } | null)?.full_name ||
            "Unknown",
          githubUsername: (m.profiles as { github_username?: string } | null)
            ?.github_username,
          role: m.role,
          joinedAt: m.joined_at,
        })) || [],
      contributions: contributionList,
      memberBreakdown,
      chart: {
        githubVsDocs: memberBreakdown.map((m) => ({
          name: m.name,
          githubPct: m.githubPct,
          docsPct: m.docsPct,
          commits: m.commits,
          docsMinutes: m.docsMinutes,
        })),
      },
      commitStats: {
        total: commits?.length || 0,
        totalAdditions:
          commits?.reduce((sum, c) => sum + (c.additions || 0), 0) || 0,
        totalDeletions:
          commits?.reduce((sum, c) => sum + (c.deletions || 0), 0) || 0,
      },
      docsStats: {
        entries: safeDocs.length,
        totalMinutes: safeDocs.reduce((s, d) => s + (d.minutes_spent || 0), 0),
      },
      aiAnalysis: gemini?.overview ?? null,
      aiGrades: gemini?.memberGrades ?? [],
      generatedAt: new Date().toISOString(),
    }

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
