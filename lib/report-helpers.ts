export type MemberContribution = {
  userId: string
  name: string
  githubUsername: string | null
  commits: number
  githubAdditions: number
  githubDeletions: number
  githubLineDelta: number
  docsMinutes: number
  docsLinesAdded: number
  docsLinesRemoved: number
  docsWeight: number
  githubPct: number
  docsPct: number
}

export function aggregateContributions(
  memberRows: {
    user_id: string
    profiles: { full_name: string | null; github_username: string | null } | null
  }[],
  commits: { author_id: string | null; additions: number | null; deletions: number | null }[],
  docsRows: {
    user_id: string
    minutes_spent: number | null
    lines_added: number | null
    lines_removed: number | null
  }[]
): MemberContribution[] {
  const byUser = new Map<string, MemberContribution>()

  for (const m of memberRows) {
    const name =
      m.profiles?.full_name ||
      m.profiles?.github_username ||
      "Unknown"
    byUser.set(m.user_id, {
      userId: m.user_id,
      name,
      githubUsername: m.profiles?.github_username ?? null,
      commits: 0,
      githubAdditions: 0,
      githubDeletions: 0,
      githubLineDelta: 0,
      docsMinutes: 0,
      docsLinesAdded: 0,
      docsLinesRemoved: 0,
      docsWeight: 0,
      githubPct: 0,
      docsPct: 0,
    })
  }

  for (const c of commits) {
    if (!c.author_id) continue
    const row = byUser.get(c.author_id)
    if (!row) continue
    row.commits += 1
    row.githubAdditions += c.additions || 0
    row.githubDeletions += c.deletions || 0
    row.githubLineDelta += (c.additions || 0) + (c.deletions || 0)
  }

  for (const d of docsRows) {
    const row = byUser.get(d.user_id)
    if (!row) continue
    const mins = d.minutes_spent || 0
    const la = d.lines_added || 0
    const lr = d.lines_removed || 0
    row.docsMinutes += mins
    row.docsLinesAdded += la
    row.docsLinesRemoved += lr
    row.docsWeight += la + lr + mins
  }

  const totalGithubLines = Array.from(byUser.values()).reduce(
    (s, r) => s + r.githubLineDelta,
    0
  )
  const totalDocsWeight = Array.from(byUser.values()).reduce(
    (s, r) => s + r.docsWeight,
    0
  )

  for (const row of byUser.values()) {
    row.githubPct =
      totalGithubLines > 0
        ? Math.round((row.githubLineDelta / totalGithubLines) * 1000) / 10
        : 0
    row.docsPct =
      totalDocsWeight > 0
        ? Math.round((row.docsWeight / totalDocsWeight) * 1000) / 10
        : 0
  }

  return Array.from(byUser.values()).sort(
    (a, b) =>
      b.githubLineDelta +
        b.docsWeight -
        (a.githubLineDelta + a.docsWeight)
  )
}

export function parseGeminiJson<T>(text: string): T | null {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = (fence ? fence[1] : trimmed).trim()
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
