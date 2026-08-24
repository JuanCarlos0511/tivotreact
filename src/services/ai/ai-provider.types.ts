import type { AiProviderName } from '../storage.service'

export interface ChatContextMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiProviderRuntimeConfig {
  provider: AiProviderName
  apiKey: string
  baseUrl: string
  modelName: string
  timeoutMs: number
  temperature: number
}
