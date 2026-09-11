import type { AiProvider } from '@shared/types'
import type { AiProviderRuntimeConfig } from './ai-provider.types'
import { env } from '@config/env'
import { GeminiAdapter } from './gemini.adapter'
import { OllamaAdapter } from './ollama.adapter'
import { OpenAiAdapter } from './openai.adapter'
import { QwenAdapter } from './qwen.adapter'

export const createAiProvider = (): AiProvider => {
  const config = resolveRuntimeConfig()
  if (config.provider === 'qwen') {
    return new QwenAdapter(config)
  }

  if (config.provider === 'ollama') {
    return new OllamaAdapter(config)
  }

  if (config.provider === 'openai' && config.apiKey) {
    return new OpenAiAdapter(config)
  }

  if (config.provider === 'gemini' && config.apiKey) {
    return new GeminiAdapter(config)
  }

  throw new Error(`No hay un proveedor IA real configurado para "${config.provider}".`)
}

const resolveRuntimeConfig = (): AiProviderRuntimeConfig => {
  const provider = env.VITE_AI_PROVIDER

  return {
    provider,
    apiKey: '',
    baseUrl: (provider === 'qwen' ? env.VITE_API_URL : env.VITE_AI_BASE_URL).replace(/\/+$/, ''),
    modelName: env.VITE_AI_MODEL_NAME,
    timeoutMs: env.VITE_AI_TIMEOUT_MS,
    temperature: env.VITE_AI_TEMPERATURE,
  }
}
