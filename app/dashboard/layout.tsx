import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth/profile"
import { AppSidebar } from "@/components/layout/app-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getCurrentProfile()
  const isInstructor = profile?.role === "instructor"

  return (
    <div className="dashboard-canvas min-h-screen">
      <AppSidebar
        user={{ email: user.email, user_metadata: user.user_metadata }}
        isInstructor={isInstructor}
      />
      <main className="ml-[var(--sidebar-width-collapsed)] min-h-screen transition-[margin] duration-[var(--transition-slow)]">
        {children}
      </main>
    </div>
  )
}
