import type { EnvConfig } from '@config/env'
import type { AiProviderPort } from '@domain/ports/ai-provider.port'

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export class OpenAiApiAdapter implements AiProviderPort {
  constructor(private readonly config: EnvConfig) {}

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.VITE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.VITE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.VITE_AI_MODEL_NAME,
        temperature: this.config.VITE_AI_TEMPERATURE,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(this.config.VITE_AI_TIMEOUT_MS),
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
