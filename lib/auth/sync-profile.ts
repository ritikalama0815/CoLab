import { createClient } from "@/lib/supabase/client"

/**
 * Client-side helper: ensures the profiles row exists and its `role` column
 * matches the `app_role` stored in Supabase user metadata.
 *
 * Call this right after login / signup (before navigating to /dashboard)
 * so the dashboard never renders with a stale role.
 */
export async function syncProfileRole(): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const desired = user.user_metadata?.app_role as
    | "student"
    | "instructor"
    | undefined
  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    null

  const { data: row } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single()

  if (!row) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name: fullName,
        role: desired ?? "student",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    return
  }

  if (desired === "instructor" && row.role !== "instructor") {
    await supabase
      .from("profiles")
      .update({ role: "instructor", updated_at: new Date().toISOString() })
      .eq("id", user.id)
  }
}
