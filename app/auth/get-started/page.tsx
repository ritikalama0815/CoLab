import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GraduationCap, Presentation, Users, Sparkles } from "lucide-react"

export default function GetStartedPage() {
  return (
    <div className="relative mesh-page-bg flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10">
      <div className="pointer-events-none absolute left-1/4 top-20 h-48 w-48 rounded-full bg-[oklch(0.65_0.2_300_/_0.35)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 right-1/4 h-40 w-40 rounded-full bg-[oklch(0.58_0.18_285_/_0.3)] blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex flex-col gap-8">
          <Link href="/" className="flex items-center justify-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-[oklch(0.45_0.2_285)] shadow-lg shadow-primary/25">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">FairGroup</span>
          </Link>

          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Choose your role
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              How will you use FairGroup?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Teachers create groups and add students; students join when invited.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="feature-card-glow flex h-full flex-col border-border/80 bg-card/90">
              <CardHeader className="flex flex-1 flex-col">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                  <GraduationCap className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-lg">Student</CardTitle>
                <CardDescription className="flex-1">
                  Join groups your instructor adds you to and track your contributions.
                </CardDescription>
                <Button className="mt-4 w-full" variant="outlineGlow" asChild>
                  <Link href="/auth/sign-up?role=student">Continue as student</Link>
                </Button>
              </CardHeader>
            </Card>
            <Card className="feature-card-glow flex h-full flex-col border-border/80 bg-card/90">
              <CardHeader className="flex flex-1 flex-col">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[oklch(0.72_0.14_310_/_0.25)]">
                  <Presentation className="h-7 w-7 text-accent-foreground" />
                </div>
                <CardTitle className="text-lg">Teacher</CardTitle>
                <CardDescription className="flex-1">
                  Create groups, add students, and run contribution reports.
                </CardDescription>
                <Button className="mt-4 w-full" variant="gradient" asChild>
                  <Link href="/auth/sign-up?role=instructor">Continue as teacher</Link>
                </Button>
              </CardHeader>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-primary underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
