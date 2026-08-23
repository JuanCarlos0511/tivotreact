import type { AiProvider } from '@shared/types'
import type { AiProviderRuntimeConfig } from './ai-provider.types'
import { env } from '@config/env'
import { getAiRuntimeSettings } from '../storage.service'
import { GeminiAdapter } from './gemini.adapter'
import { MockTivotAdapter } from './mock-tivot.adapter'
import { OllamaAdapter } from './ollama.adapter'
import { OpenAiAdapter } from './openai.adapter'

export const createAiProvider = (): AiProvider => {
  const config = resolveRuntimeConfig()

  if (config.provider === 'ollama') {
    return new OllamaAdapter(config)
  }

  if (config.provider === 'openai' && config.apiKey) {
    return new OpenAiAdapter(config)
  }

  if (config.provider === 'gemini' && config.apiKey) {
    return new GeminiAdapter(config)
  }

  return new MockTivotAdapter()
}

const resolveRuntimeConfig = (): AiProviderRuntimeConfig => {
  const settings = getAiRuntimeSettings()
  const provider = settings?.provider ?? env.VITE_AI_PROVIDER

  return {
    provider,
    apiKey: settings?.apiKey.trim() ?? '',
    baseUrl: env.VITE_AI_BASE_URL,
    modelName: env.VITE_AI_MODEL_NAME,
    timeoutMs: env.VITE_AI_TIMEOUT_MS,
    temperature: env.VITE_AI_TEMPERATURE,
  }
}
