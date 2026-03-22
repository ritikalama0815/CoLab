"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard, FolderKanban, Settings, LogOut,
  Users, ChevronLeft, ChevronRight, Presentation,
  GraduationCap, PanelLeftClose, PanelLeft
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface AppSidebarProps {
  user: {
    email?: string
    user_metadata?: Record<string, unknown>
  }
  isInstructor: boolean
}

const instructorLinks = [
  { href: "/dashboard/instructor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/instructor/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

const studentLinks = [
  { href: "/dashboard/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/student/groups", label: "My Groups", icon: FolderKanban },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function AppSidebar({ user, isInstructor }: AppSidebarProps) {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const expanded = pinned || hovered
  const links = isInstructor ? instructorLinks : studentLinks
  const displayName = (user.user_metadata?.full_name as string) || user.email || ""

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <>
      {/* Overlay when expanded but not pinned (mobile-like) */}
      {expanded && !pinned && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setHovered(false)}
        />
      )}

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-sidebar",
          "transition-[width] duration-[var(--transition-slow)]",
          expanded ? "w-[var(--sidebar-width-expanded)]" : "w-[var(--sidebar-width-collapsed)]"
        )}
      >
        {/* Logo area */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Users className="h-4 w-4" />
          </div>
          <span
            className={cn(
              "truncate text-lg font-semibold text-foreground transition-opacity duration-200",
              expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
            )}
          >
            FairGroup
          </span>
        </div>

        {/* Role badge */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 transition-opacity duration-200",
          expanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden py-0"
        )}>
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              isInstructor
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            {isInstructor ? (
              <><Presentation className="mr-1 h-3 w-3" /> Teacher</>
            ) : (
              <><GraduationCap className="mr-1 h-3 w-3" /> Student</>
            )}
          </Badge>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-2 py-2">
          {links.map((link) => {
            const Icon = link.icon
            const isActive =
              pathname === link.href ||
              (link.href !== "/dashboard/instructor" &&
               link.href !== "/dashboard/student" &&
               pathname.startsWith(link.href))
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={cn(
                    "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span
                    className={cn(
                      "truncate transition-opacity duration-200",
                      expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                    )}
                  >
                    {link.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom: user + sign out + pin toggle */}
        <div className="border-t border-border p-2 space-y-1">
          {/* User info */}
          <div className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 transition-opacity duration-200",
            expanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden py-0"
          )}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-medium text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "truncate transition-opacity duration-200",
                expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              )}
            >
              Sign out
            </span>
          </button>

          {/* Pin toggle */}
          <button
            onClick={() => setPinned(!pinned)}
            className="flex h-8 w-full items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
          >
            {pinned ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
