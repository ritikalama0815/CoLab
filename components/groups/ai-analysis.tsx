"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, Lock } from "lucide-react"
import { motion } from "framer-motion"

interface AIAnalysisProps {
  groupId: string
  hasData: boolean
  canRunAnalysis: boolean
}

export function AIAnalysis({ groupId, hasData, canRunAnalysis }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateAnalysis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate analysis")
      }

      setAnalysis(data.analysis)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to generate analysis")
    } finally {
      setIsLoading(false)
    }
  }

  if (!canRunAnalysis) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="border-dashed border-primary/25 bg-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-5 w-5 text-muted-foreground" />
              AI analysis
            </CardTitle>
            <CardDescription>
              Only the instructor who created this group can run AI analysis and view grading-oriented insights.
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Analysis
              </CardTitle>
              <CardDescription>
                AI-powered contribution assessment and recommendations
              </CardDescription>
            </div>
            {!analysis && (
              <Button
                onClick={generateAnalysis}
                disabled={isLoading || !hasData}
                variant="gradient"
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Analysis
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasData && (
            <p className="text-muted-foreground">
              Sync your GitHub commits to enable AI analysis.
            </p>
          )}
          {error && <p className="text-destructive">{error}</p>}
          {analysis && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              {analysis.split("\n").map((paragraph, index) => (
                <p key={index} className="mb-2 text-sm text-foreground last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
