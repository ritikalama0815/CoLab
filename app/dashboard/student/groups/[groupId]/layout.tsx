"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Briefcase } from "lucide-react"

const tabs = [
  { suffix: "", label: "Portal", icon: LayoutDashboard },
  { suffix: "/teammates", label: "Teammates", icon: Users },
  { suffix: "/workspace", label: "Workspace", icon: Briefcase },
]

export default function StudentGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const params = useParams<{ groupId: string }>()
  const base = `/dashboard/student/groups/${params.groupId}`

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="shrink-0 px-5 pt-4 pb-2">
        <nav className="flex gap-1 rounded-lg border border-border/50 bg-card/50 p-1">
          {tabs.map((tab) => {
            const href = base + tab.suffix
            const isActive = tab.suffix === ""
              ? pathname === href
              : pathname.startsWith(href)
            const Icon = tab.icon
            return (
              <Link key={tab.suffix} href={href} className="flex-1">
                <div
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </div>
              </Link>
            )
          })}
        </nav>
      </div>
      {/* Content fills remaining height */}
      <div className="flex-1 min-h-0 px-5 pb-4">
        {children}
      </div>
    </div>
  )
}
