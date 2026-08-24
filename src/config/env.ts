import { z } from 'zod'

const envSchema = z.object({
  VITE_AI_PROVIDER: z.enum(['gemini', 'openai', 'ollama', 'qwen']).default('qwen'),
  VITE_AI_BASE_URL: z.string().url().default('https://generativelanguage.googleapis.com/v1beta'),
  VITE_AI_MODEL_NAME: z.string().default('gemini-1.5-flash'),
  VITE_AI_TIMEOUT_MS: z.coerce.number().positive().default(15000),
  VITE_AI_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.4),
  VITE_QWEN_API_KEY: z.string().default(''),
  VITE_QWEN_BASE_URL: z.string().url().default('https://dashscope-intl.aliyuncs.com/compatible-mode/v1'),
  VITE_QWEN_MODEL: z.string().default('qwen-plus'),
})

export const env = envSchema.parse(import.meta.env)
export type EnvConfig = z.infer<typeof envSchema>
