import { z } from 'zod'

type RuntimeEnv = Record<string, string | undefined>

const runtimeEnv =
  (globalThis as typeof globalThis & { process?: { env?: RuntimeEnv } }).process?.env ?? {}

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

export const env = envSchema.parse({
  VITE_AI_PROVIDER: runtimeEnv.EXPO_PUBLIC_AI_PROVIDER ?? runtimeEnv.VITE_AI_PROVIDER,
  VITE_AI_BASE_URL: runtimeEnv.EXPO_PUBLIC_AI_BASE_URL ?? runtimeEnv.VITE_AI_BASE_URL,
  VITE_AI_MODEL_NAME: runtimeEnv.EXPO_PUBLIC_AI_MODEL_NAME ?? runtimeEnv.VITE_AI_MODEL_NAME,
  VITE_AI_TIMEOUT_MS: runtimeEnv.EXPO_PUBLIC_AI_TIMEOUT_MS ?? runtimeEnv.VITE_AI_TIMEOUT_MS,
  VITE_AI_TEMPERATURE: runtimeEnv.EXPO_PUBLIC_AI_TEMPERATURE ?? runtimeEnv.VITE_AI_TEMPERATURE,
  VITE_QWEN_API_KEY: runtimeEnv.EXPO_PUBLIC_QWEN_API_KEY ?? runtimeEnv.VITE_QWEN_API_KEY,
  VITE_QWEN_BASE_URL: runtimeEnv.EXPO_PUBLIC_QWEN_BASE_URL ?? runtimeEnv.VITE_QWEN_BASE_URL,
  VITE_QWEN_MODEL: runtimeEnv.EXPO_PUBLIC_QWEN_MODEL ?? runtimeEnv.VITE_QWEN_MODEL,
})
export type EnvConfig = z.infer<typeof envSchema>
