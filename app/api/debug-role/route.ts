import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated", authError })
  }

  const metadata = {
    app_role: user.user_metadata?.app_role,
    full_name: user.user_metadata?.full_name,
    email: user.email,
    id: user.id,
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single()

  return NextResponse.json({
    metadata,
    profileRow,
    profileError,
    wouldRedirectTo: profileRow?.role === "instructor" ? "/dashboard/instructor" : "/dashboard/student",
  })
}
