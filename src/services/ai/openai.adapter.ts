import type { AiProvider } from '@shared/types'
import type { AiProviderRuntimeConfig } from './ai-provider.types'

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export class OpenAiAdapter implements AiProvider {
  constructor(private readonly config: AiProviderRuntimeConfig) {}

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    })

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`)
    }

    const data: OpenAiChatResponse = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim()

    if (!text) {
      throw new Error('OpenAI response did not include text')
    }

    return text
  }
}
