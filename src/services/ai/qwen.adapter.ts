import type { AiProvider } from '@shared/types'
import type { AiProviderRuntimeConfig, ChatContextMessage } from './ai-provider.types'
import { sanitizeUserInput } from '../privacy/sanitize-input'

interface QwenChatResponse {
  content?: string
}

export class QwenAdapter implements AiProvider {
  constructor(private readonly config: AiProviderRuntimeConfig) {}

  async complete(prompt: string, messages: ChatContextMessage[] = [{ role: 'user', content: prompt }]): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/ai/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map((message) => ({
          ...message,
          content: sanitizeUserInput(message.content),
        })),
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Error en Qwen API (${response.status}): ${errorData}`)
    }

    const data: QwenChatResponse = await response.json()
    const text = data.content?.trim()

    if (!text) {
      throw new Error('El backend no devolvió contenido de Qwen')
    }

    return text
  }
}
