import { z } from 'zod'

const envSchema = z.object({
  VITE_AI_PROVIDER: z.enum(['gemini', 'openai', 'ollama']).default('gemini'),
  VITE_AI_API_KEY: z.string().default(''),
  VITE_AI_BASE_URL: z.string().url().default('https://generativelanguage.googleapis.com/v1beta'),
  VITE_AI_MODEL_NAME: z.string().default('gemini-1.5-flash'),
  VITE_AI_TIMEOUT_MS: z.coerce.number().positive().default(15000),
  VITE_AI_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.2),
  VITE_POS_DEFAULT_CURRENCY: z.string().length(3).default('MXN'),
  VITE_POS_TAX_RATE: z.coerce.number().min(0).max(1).default(0.16),
  VITE_ENABLE_MOCK_DATA: z.string().transform((value) => value === 'true').default('true'),
})

export const env = envSchema.parse(import.meta.env)
export type EnvConfig = z.infer<typeof envSchema>
