"use client"

import Image from "next/image"
import Link from "next/link"
import {
  Link2,
  Globe,
  FileText,
  FolderGit2,
  ExternalLink,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface ResourceThumbnailItem {
  id: string
  title: string
  url: string
  resource_type: string
  created_at: string
  profiles: { full_name: string | null } | null
}

const typeIcons: Record<string, typeof Globe> = {
  link: Globe,
  document: FileText,
  repo: FolderGit2,
  other: Link2,
}

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  link: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-200/50 dark:border-blue-500/20" },
  document: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200/50 dark:border-amber-500/20" },
  repo: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-200/50 dark:border-emerald-500/20" },
  other: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border/60" },
}

const typeLabel: Record<string, string> = {
  link: "Link",
  document: "Doc",
  repo: "Repo",
  other: "Link",
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return ""
  }
}

function isGoogleUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return (
      host.includes("google.com") ||
      host.includes("docs.google.com") ||
      host.includes("drive.google.com") ||
      host.includes("slides.google.com") ||
      host.includes("sheets.google.com")
    )
  } catch {
    return false
  }
}

interface ResourceThumbnailGridProps {
  resources: ResourceThumbnailItem[]
  memberEmails: string[]
  portalHref?: string
}

export function ResourceThumbnailGrid({
  resources,
  memberEmails,
  portalHref,
}: ResourceThumbnailGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyAndOpen = async (id: string, url: string) => {
    await navigator.clipboard.writeText(memberEmails.join(", "))
    setCopiedId(id)
    setTimeout(() => window.open(url, "_blank"), 400)
    setTimeout(() => setCopiedId(null), 2200)
  }

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/5 px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
          <Link2 className="h-8 w-8 text-primary/70" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">No shared links yet</h3>
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Add docs, repos, and drive links from the Portal — they&apos;ll show up here automatically.
        </p>
        {portalHref && (
          <Button asChild variant="outline" size="sm" className="mt-5 gap-1.5">
            <Link href={portalHref}>
              Go to Portal
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
      {resources.map((r) => {
        const Icon = typeIcons[r.resource_type] || Link2
        const colors = typeColors[r.resource_type] || typeColors.other
        const domain = getDomain(r.url)
        const favicon = getFaviconUrl(r.url)
        const label = typeLabel[r.resource_type] || "Link"
        const showShare = memberEmails.length > 0 && isGoogleUrl(r.url)

        return (
          <div
            key={r.id}
            className={cn(
              "group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-all duration-200",
              "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/25",
              colors.border
            )}
          >
            {/* Thumbnail — valid HTML: no button inside <a> */}
            <div className={cn("relative h-22", colors.bg)}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                aria-label={`Open ${r.title}`}
              >
                <Icon className={cn("h-9 w-9 opacity-25", colors.text)} />
                {favicon && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Image
                      src={favicon}
                      alt=""
                      width={36}
                      height={36}
                      className="rounded-lg shadow-sm"
                      unoptimized
                    />
                  </span>
                )}
              </a>

              <span
                className={cn(
                  "pointer-events-none absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  "bg-background/90 text-foreground/80 shadow-sm backdrop-blur-sm ring-1 ring-border/40"
                )}
              >
                {label}
              </span>

              <div className="absolute right-2 top-2 flex gap-1">
                {showShare && (
                  <button
                    type="button"
                    onClick={() => void copyAndOpen(r.id, r.url)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold shadow-sm transition-colors",
                      "bg-background/95 text-blue-600 ring-1 ring-border/50 backdrop-blur-sm",
                      "hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    )}
                  >
                    {copiedId === r.id ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Share
                  </button>
                )}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border/50 backdrop-blur-sm transition-colors hover:text-foreground"
                  aria-label="Open in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 flex-col p-3 transition-colors hover:bg-muted/30"
            >
              <p className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
                {r.title}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {favicon && (
                  <Image src={favicon} alt="" width={12} height={12} className="rounded-sm opacity-80" unoptimized />
                )}
                <span className="truncate">{domain}</span>
              </div>
              {r.profiles?.full_name && (
                <p className="mt-1.5 truncate text-[10px] text-muted-foreground/70">Added by {r.profiles.full_name}</p>
              )}
            </a>
          </div>
        )
      })}
    </div>
  )
}
