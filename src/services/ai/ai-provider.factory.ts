import type { AiProvider } from '@shared/types'
import type { AiProviderRuntimeConfig } from './ai-provider.types'
import { env } from '@config/env'
import { GeminiAdapter } from './gemini.adapter'
import { OllamaAdapter } from './ollama.adapter'
import { OpenAiAdapter } from './openai.adapter'
import { QwenAdapter } from './qwen.adapter'

export const createAiProvider = (): AiProvider => {
  const config = resolveRuntimeConfig()
  const hasQwenApiKey = env.VITE_QWEN_API_KEY.trim().length > 0

  if (config.provider === 'qwen' || hasQwenApiKey) {
    return new QwenAdapter({
      ...config,
      provider: 'qwen',
      apiKey: env.VITE_QWEN_API_KEY.trim(),
      baseUrl: env.VITE_QWEN_BASE_URL,
      modelName: env.VITE_QWEN_MODEL,
    })
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

  throw new Error(`No hay un proveedor IA real configurado para "${config.provider}". Configura VITE_AI_PROVIDER=qwen y VITE_QWEN_API_KEY.`)
}

const resolveRuntimeConfig = (): AiProviderRuntimeConfig => {
  const provider = env.VITE_AI_PROVIDER

  return {
    provider,
    apiKey: provider === 'qwen' ? env.VITE_QWEN_API_KEY.trim() : '',
    baseUrl: provider === 'qwen' ? env.VITE_QWEN_BASE_URL : env.VITE_AI_BASE_URL,
    modelName: provider === 'qwen' ? env.VITE_QWEN_MODEL : env.VITE_AI_MODEL_NAME,
    timeoutMs: env.VITE_AI_TIMEOUT_MS,
    temperature: env.VITE_AI_TEMPERATURE,
  }
}
