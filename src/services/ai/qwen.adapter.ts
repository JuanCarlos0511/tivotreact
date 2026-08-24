import type { AiProvider } from '@shared/types'
import type { AiProviderRuntimeConfig, ChatContextMessage } from './ai-provider.types'

interface QwenChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export class QwenAdapter implements AiProvider {
  constructor(private readonly config: AiProviderRuntimeConfig) {}

  async complete(prompt: string, messages: ChatContextMessage[] = [{ role: 'user', content: prompt }]): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    })

    if (!response.ok) {
      throw new Error(`Qwen request failed with status ${response.status}`)
    }

    const data: QwenChatResponse = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim()

    if (!text) {
      throw new Error('Qwen response did not include text')
    }

    return text
  }
}
