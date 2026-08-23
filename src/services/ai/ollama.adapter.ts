import type { AiProvider } from '@shared/types'
import type { AiProviderRuntimeConfig } from './ai-provider.types'

interface OllamaGenerateResponse {
  response?: string
  message?: {
    content?: string
  }
}

export class OllamaAdapter implements AiProvider {
  constructor(private readonly config: AiProviderRuntimeConfig) {}

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.modelName,
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
        },
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
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
