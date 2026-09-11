import { z } from 'zod'

const envSchema = z.object({
  VITE_AI_PROVIDER: z.enum(['gemini', 'openai', 'ollama', 'qwen']).default('qwen'),
  VITE_AI_BASE_URL: z.string().url().default('https://generativelanguage.googleapis.com/v1beta'),
  VITE_AI_MODEL_NAME: z.string().default('gemini-1.5-flash'),
  VITE_AI_TIMEOUT_MS: z.coerce.number().positive().default(15000),
  VITE_AI_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.4),
  VITE_API_URL: z.string().url().default('http://localhost:8000/api/v1'),
})

export const env = envSchema.parse(import.meta.env)
export type EnvConfig = z.infer<typeof envSchema>
