export type AiProviderName = 'gemini' | 'openai' | 'ollama' | 'qwen'

export interface AiRuntimeSettings {
  provider: AiProviderName
  apiKey: string
}

const AI_SETTINGS_KEY = 'tivot.ai-settings'

export const getAiRuntimeSettings = (): AiRuntimeSettings | null => {
  if (typeof window === 'undefined') return null

  const rawValue = window.localStorage.getItem(AI_SETTINGS_KEY)
  if (!rawValue) return null

  try {
    const parsed: unknown = JSON.parse(rawValue)
    if (!isAiRuntimeSettings(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export const saveAiRuntimeSettings = (settings: AiRuntimeSettings) => {
  window.localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings))
}

const isAiRuntimeSettings = (value: unknown): value is AiRuntimeSettings => {
  if (!value || typeof value !== 'object') return false

  const settings = value as Record<string, unknown>
  return isProvider(settings.provider) && typeof settings.apiKey === 'string'
}

const isProvider = (value: unknown): value is AiProviderName =>
  value === 'gemini' || value === 'openai' || value === 'ollama' || value === 'qwen'
