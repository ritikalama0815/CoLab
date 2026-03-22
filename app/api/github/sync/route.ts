import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
  }
  author: {
    login: string
  } | null
  stats?: {
    additions: number
    deletions: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await request.json()

    if (!groupId) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 })
    }

    // Get the group (now project_groups)
    const { data: group, error: groupError } = await supabase
      .from("project_groups")
      .select("*, projects ( created_by )")
      .eq("id", groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (!group.github_repo_url) {
      return NextResponse.json({ error: "No GitHub repository connected" }, { status: 400 })
    }

    // Parse GitHub URL to get owner/repo
    const repoMatch = group.github_repo_url.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!repoMatch) {
      return NextResponse.json({ error: "Invalid GitHub repository URL" }, { status: 400 })
    }

    const [, owner, repo] = repoMatch
    const cleanRepo = repo.replace(/\.git$/, "")

    // Fetch commits from GitHub API (public repos don't need auth)
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/commits?per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "FairGroup-App",
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: `GitHub API error: ${errorData.message}` },
        { status: response.status }
      )
    }

    const commits: GitHubCommit[] = await response.json()

    // Get group members to map GitHub usernames to user IDs
    const { data: members } = await supabase
      .from("memberships")
      .select(`
        user_id,
        profiles (
          github_username
        )
      `)
      .eq("group_id", groupId)

    const githubToUserId = new Map<string, string>()
    members?.forEach((m) => {
      if (m.profiles?.github_username) {
        githubToUserId.set(m.profiles.github_username.toLowerCase(), m.user_id)
      }
    })

    // Fetch detailed stats for each commit and insert into database
    let syncedCount = 0
    const errors: string[] = []

    for (const commit of commits) {
      try {
        // Check if commit already exists
        const { data: existing } = await supabase
          .from("commits")
          .select("id")
          .eq("sha", commit.sha)
          .eq("group_id", groupId)
          .single()

        if (existing) continue

        // Fetch detailed commit info for additions/deletions
        const detailResponse = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepo}/commits/${commit.sha}`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "FairGroup-App",
            },
          }
        )

        let additions = 0
        let deletions = 0

        if (detailResponse.ok) {
          const detailData = await detailResponse.json()
          additions = detailData.stats?.additions || 0
          deletions = detailData.stats?.deletions || 0
        }

        // Map author to user ID
        const githubUsername = commit.author?.login?.toLowerCase() || ""
        const authorId = githubToUserId.get(githubUsername) || null

        // Insert commit
        const { error: insertError } = await supabase
          .from("commits")
          .insert({
            group_id: groupId,
            sha: commit.sha,
            message: commit.commit.message.slice(0, 500), // Truncate long messages
            author_id: authorId,
            github_username: commit.author?.login || commit.commit.author.name,
            additions,
            deletions,
            committed_at: commit.commit.author.date,
          })

        if (insertError) {
          errors.push(`Failed to insert commit ${commit.sha}: ${insertError.message}`)
        } else {
          syncedCount++
        }

        // Rate limiting - wait a bit between API calls
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        errors.push(`Error processing commit ${commit.sha}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    // Update contribution scores after sync
    await updateContributionScores(supabase, groupId)

    return NextResponse.json({
      success: true,
      syncedCount,
      totalCommits: commits.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    })
  } catch (error) {
    console.error("GitHub sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync" },
      { status: 500 }
    )
  }
}

async function updateContributionScores(supabase: Awaited<ReturnType<typeof createClient>>, groupId: string) {
  // Get all commits for this group
  const { data: commits } = await supabase
    .from("commits")
    .select("author_id, additions, deletions")
    .eq("group_id", groupId)
    .not("author_id", "is", null)

  if (!commits || commits.length === 0) return

  // Calculate scores by author
  const scoresByAuthor = new Map<string, { additions: number; deletions: number; commits: number }>()

  commits.forEach((commit) => {
    if (!commit.author_id) return
    const current = scoresByAuthor.get(commit.author_id) || { additions: 0, deletions: 0, commits: 0 }
    scoresByAuthor.set(commit.author_id, {
      additions: current.additions + (commit.additions || 0),
      deletions: current.deletions + (commit.deletions || 0),
      commits: current.commits + 1,
    })
  })

  // Calculate total to normalize scores
  const totalLines = Array.from(scoresByAuthor.values()).reduce(
    (sum, s) => sum + s.additions + s.deletions,
    0
  )

  // Upsert scores
  for (const [userId, stats] of scoresByAuthor) {
    const score = totalLines > 0 
      ? Math.round(((stats.additions + stats.deletions) / totalLines) * 100)
      : 0

    await supabase
      .from("contribution_scores")
      .upsert({
        group_id: groupId,
        user_id: userId,
        github_commits: stats.commits,
        github_additions: stats.additions,
        github_deletions: stats.deletions,
        score,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "group_id,user_id",
      })
  }
}
