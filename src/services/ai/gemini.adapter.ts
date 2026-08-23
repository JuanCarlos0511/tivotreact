import type { AiProvider } from '@shared/types'
import type { AiProviderRuntimeConfig } from './ai-provider.types'

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

export class GeminiAdapter implements AiProvider {
  constructor(private readonly config: AiProviderRuntimeConfig) {}

  async complete(prompt: string): Promise<string> {
    const response = await fetch(
      `${this.config.baseUrl}/models/${this.config.modelName}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: this.config.temperature,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}`)
    }

    const data: GeminiResponse = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()

    if (!text) {
      throw new Error('Gemini response did not include text')
    }

    return text
  }
}
