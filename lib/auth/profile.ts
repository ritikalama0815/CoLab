import { createClient } from "@/lib/supabase/server"

export type ProfileRole = "student" | "instructor"

export type CurrentProfile = {
  id: string
  role: ProfileRole
  full_name: string | null
  email: string | null
  github_username: string | null
}

function metaAppRole(user: {
  user_metadata?: Record<string, unknown>
}): ProfileRole | null {
  const raw = user.user_metadata?.app_role
  if (raw === "instructor" || raw === "student") return raw
  return null
}

/**
 * Loads the profiles row and ensures `role` matches signup metadata (`app_role`).
 *
 * Handles three failure modes:
 *  1. DB trigger never ran → profile row missing → upsert it from metadata.
 *  2. Trigger ran but with stale/empty metadata → row exists with wrong role → update it.
 *  3. Trigger ran correctly → no-op.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const desired = metaAppRole(user)
  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    null

  let { data: row } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, github_username")
    .eq("id", user.id)
    .single()

  if (!row) {
    const { data: inserted } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: fullName,
          role: desired ?? "student",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id, role, full_name, email, github_username")
      .single()

    row = inserted
  }

  if (!row) return null

  let role = row.role as ProfileRole

  if (desired && desired !== row.role) {
    if (desired === "instructor") {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "instructor", updated_at: new Date().toISOString() })
        .eq("id", user.id)

      if (!error) {
        role = "instructor"
      }
    }
  }

  return {
    id: row.id,
    role,
    full_name: row.full_name,
    email: row.email,
    github_username: row.github_username ?? null,
  }
}
