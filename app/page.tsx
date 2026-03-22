import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GitBranch, Users, FileText, BarChart3, Shield, Zap, Sparkles } from "lucide-react"
import { AnimatedSection } from "@/components/motion/animated-section"
import { StaggerChildren, StaggerItem } from "@/components/motion/stagger-children"
import { StudentStudyingAnimation } from "@/components/landing/student-studying-animation"

export default function LandingPage() {
  return (
    <div className="relative mesh-page-bg min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-[oklch(0.65_0.2_300_/_0.35)] blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-24 top-40 h-64 w-64 rounded-full bg-[oklch(0.6_0.18_285_/_0.3)] blur-3xl animate-float-delayed" />
      <div className="pointer-events-none absolute bottom-20 left-1/3 h-56 w-56 rounded-full bg-[oklch(0.58_0.16_310_/_0.22)] blur-3xl" />

      <header className="relative z-10 glass-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-[oklch(0.45_0.2_285)] shadow-lg shadow-primary/30">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">FairGroup</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-foreground/90">
                Login
              </Button>
            </Link>
            <Link href="/auth/get-started">
              <Button variant="gradient" size="sm" className="rounded-full px-5">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 px-6 pb-20 pt-12 md:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-8">
          <AnimatedSection className="text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary lg:mx-0 mx-auto">
              <Sparkles className="h-4 w-4" />
              Built for fair group grading
            </div>
            <h1 className="hero-gradient-text text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Fair Grading for Group Projects
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground lg:mx-0">
              Track individual contributions in university group projects with AI-powered analytics.
              Connect GitHub and Google Docs to measure and visualize each team member&apos;s work — in rich purple clarity.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link href="/auth/get-started">
                <Button variant="hero" size="lg" className="min-w-[180px] rounded-full px-8">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outlineGlow" size="lg" className="min-w-[180px] rounded-full">
                  Learn More
                </Button>
              </Link>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.12} className="flex justify-center lg:justify-end">
            <StudentStudyingAnimation />
          </AnimatedSection>
        </div>
      </section>

      <section id="features" className="relative z-10 border-t border-primary/10 bg-muted/25 px-6 py-24 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">Everything You Need</h2>
            <p className="mt-4 text-muted-foreground">
              Comprehensive tools for tracking, analyzing, and reporting group contributions
            </p>
          </div>
          <StaggerChildren className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <StaggerItem>
              <Card className="feature-card-glow h-full border-border/80 bg-card/90">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 shadow-inner shadow-primary/10">
                    <GitBranch className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="mt-4 text-foreground">GitHub Integration</CardTitle>
                  <CardDescription>
                    Automatically track commits, pull requests, and code contributions from your repository
                  </CardDescription>
                </CardHeader>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="feature-card-glow h-full border-border/80 bg-card/90">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[oklch(0.72_0.14_310_/_0.2)]">
                    <FileText className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="mt-4 text-foreground">Google Docs Tracking</CardTitle>
                  <CardDescription>
                    Monitor document edits, comments, and writing contributions across shared files
                  </CardDescription>
                </CardHeader>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="feature-card-glow h-full border-border/80 bg-card/90">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="mt-4 text-foreground">Visual Analytics</CardTitle>
                  <CardDescription>
                    Interactive charts and dashboards showing contribution trends over time
                  </CardDescription>
                </CardHeader>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="feature-card-glow h-full border-border/80 bg-card/90">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[oklch(0.72_0.14_310_/_0.2)]">
                    <Zap className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="mt-4 text-foreground">AI-Powered Insights</CardTitle>
                  <CardDescription>
                    Get automated summaries and fair contribution scores using advanced AI analysis
                  </CardDescription>
                </CardHeader>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="feature-card-glow h-full border-border/80 bg-card/90">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="mt-4 text-foreground">Teacher-led groups</CardTitle>
                  <CardDescription>
                    Instructors create groups and add students — clear roles and transparent collaboration
                  </CardDescription>
                </CardHeader>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="feature-card-glow h-full border-border/80 bg-card/90">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[oklch(0.72_0.14_310_/_0.2)]">
                    <Shield className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="mt-4 text-foreground">PDF Reports</CardTitle>
                  <CardDescription>
                    Generate professional reports for instructors with detailed contribution breakdowns
                  </CardDescription>
                </CardHeader>
              </Card>
            </StaggerItem>
          </StaggerChildren>
        </div>
      </section>

      <section className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
            <p className="mt-4 text-muted-foreground">
              Teachers set up the roster; students connect tools and ship work
            </p>
          </div>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-[oklch(0.45_0.2_285)] text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25">
                1
              </div>
              <h3 className="mt-4 font-semibold text-foreground">Create a group</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Instructors create the project group and add students by email
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-[oklch(0.45_0.2_285)] text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25">
                2
              </div>
              <h3 className="mt-4 font-semibold text-foreground">Connect sources</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Link GitHub and Google Docs to start tracking contributions
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-[oklch(0.45_0.2_285)] text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25">
                3
              </div>
              <h3 className="mt-4 font-semibold text-foreground">View insights</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Track contributions in real time and generate fair reports
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-primary/15 bg-linear-to-br from-primary via-[oklch(0.48_0.22_300)] to-[oklch(0.42_0.2_285)] px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-primary-foreground">
            Ready to Track Contributions Fairly?
          </h2>
          <p className="mt-4 text-primary-foreground/85">
            Join students and instructors using FairGroup for transparent group work
          </p>
          <Link href="/auth/get-started">
            <Button
              size="lg"
              variant="secondary"
              className="mt-8 rounded-full border-0 bg-white/95 px-8 text-primary shadow-xl hover:bg-white"
            >
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-br from-primary to-[oklch(0.45_0.2_285)]">
              <Users className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground">FairGroup</span>
          </div>
          <p className="text-sm text-muted-foreground">Built for HackKU 2025</p>
        </div>
      </footer>
    </div>
  )
}
