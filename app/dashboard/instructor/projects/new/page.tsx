import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreateProjectForm } from "@/components/instructor/create-project-form"

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "instructor") redirect("/dashboard/student")

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <CreateProjectForm />
    </div>
  )
}
