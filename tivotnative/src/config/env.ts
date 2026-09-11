import { z } from 'zod'

const envSchema = z.object({
  VITE_AI_PROVIDER: z.enum(['gemini', 'openai', 'ollama', 'qwen']).default('qwen'),
  VITE_AI_API_KEY: z.string().default(''),
  VITE_AI_BASE_URL: z.string().url().default('https://generativelanguage.googleapis.com/v1beta'),
  VITE_AI_MODEL_NAME: z.string().default('gemini-1.5-flash'),
  VITE_AI_TIMEOUT_MS: z.coerce.number().positive().default(15000),
  VITE_AI_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.4),
  VITE_QWEN_API_KEY: z.string().default(''),
  VITE_QWEN_BASE_URL: z.string().url().default('https://dashscope-intl.aliyuncs.com/compatible-mode/v1'),
  VITE_QWEN_MODEL: z.string().default('qwen-plus'),
})

export const env = envSchema.parse({
  VITE_AI_PROVIDER: process.env.EXPO_PUBLIC_AI_PROVIDER || process.env.VITE_AI_PROVIDER,
  VITE_AI_API_KEY: process.env.EXPO_PUBLIC_AI_API_KEY || process.env.VITE_AI_API_KEY,
  VITE_AI_BASE_URL: process.env.EXPO_PUBLIC_AI_BASE_URL || process.env.VITE_AI_BASE_URL,
  VITE_AI_MODEL_NAME: process.env.EXPO_PUBLIC_AI_MODEL_NAME || process.env.VITE_AI_MODEL_NAME,
  VITE_AI_TIMEOUT_MS: process.env.EXPO_PUBLIC_AI_TIMEOUT_MS || process.env.VITE_AI_TIMEOUT_MS,
  VITE_AI_TEMPERATURE: process.env.EXPO_PUBLIC_AI_TEMPERATURE || process.env.VITE_AI_TEMPERATURE,
  VITE_QWEN_API_KEY: process.env.EXPO_PUBLIC_QWEN_API_KEY || process.env.VITE_QWEN_API_KEY,
  VITE_QWEN_BASE_URL: process.env.EXPO_PUBLIC_QWEN_BASE_URL || process.env.VITE_QWEN_BASE_URL,
  VITE_QWEN_MODEL: process.env.EXPO_PUBLIC_QWEN_MODEL || process.env.VITE_QWEN_MODEL,
})
export type EnvConfig = z.infer<typeof envSchema>
