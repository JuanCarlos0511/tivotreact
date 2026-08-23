import type { EnvConfig } from '@config/env'
import type { AiProviderPort } from '@domain/ports/ai-provider.port'

interface OllamaGenerateResponse {
  response?: string
  message?: {
    content?: string
  }
}

export class OllamaLocalAdapter implements AiProviderPort {
  constructor(private readonly config: EnvConfig) {}

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.VITE_AI_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.VITE_AI_MODEL_NAME,
        prompt,
        stream: false,
        options: {
          temperature: this.config.VITE_AI_TEMPERATURE,
        },
      }),
      signal: AbortSignal.timeout(this.config.VITE_AI_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`)
    }

    const data: OllamaGenerateResponse = await response.json()
    const text = data.response?.trim() ?? data.message?.content?.trim()

    if (!text) {
      throw new Error('Ollama response did not include text')
    }

    return text
  }
}
