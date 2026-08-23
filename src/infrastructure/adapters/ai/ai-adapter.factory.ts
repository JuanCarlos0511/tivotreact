import type { AiProviderPort } from '@domain/ports/ai-provider.port'
import { env } from '@config/env'
import { GeminiApiAdapter } from './gemini-api.adapter'
import { MockTivotAiAdapter } from './mock-tivot-ai.adapter'
import { OllamaLocalAdapter } from './ollama-local.adapter'
import { OpenAiApiAdapter } from './openai-api.adapter'

export const createAiProvider = (): AiProviderPort => {
  if (env.VITE_ENABLE_MOCK_DATA || (!env.VITE_AI_API_KEY && env.VITE_AI_PROVIDER !== 'ollama')) {
    return new MockTivotAiAdapter()
  }

  if (env.VITE_AI_PROVIDER === 'openai') {
    return new OpenAiApiAdapter(env)
  }

  if (env.VITE_AI_PROVIDER === 'ollama') {
    return new OllamaLocalAdapter(env)
  }

  return new GeminiApiAdapter(env)
}
