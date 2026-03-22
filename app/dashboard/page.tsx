import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth/profile"

export default async function DashboardPage() {
  const profile = await getCurrentProfile()

  if (profile?.role === "instructor") {
    redirect("/dashboard/instructor")
  }

  redirect("/dashboard/student")
}
