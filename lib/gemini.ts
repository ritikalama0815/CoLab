import { GoogleGenerativeAI } from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.warn("[Gemini] GEMINI_API_KEY not set — AI features will fail at runtime")
}

const genAI = new GoogleGenerativeAI(apiKey || "")

/**
 * Default: `gemini-2.5-flash` (current stable Flash on the Gemini API).
 * `gemini-1.5-flash` and older IDs are removed/deprecated and return 404.
 * Override with env if you hit quota: e.g. `GEMINI_MODEL=gemini-2.5-flash-lite`
 */
const DEFAULT_MODEL = "gemini-2.5-flash-lite"

export function getGeminiModel() {
  const model =
    process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  return genAI.getGenerativeModel({ model })
}
