import type { AiProviderPort } from '@domain/ports/ai-provider.port'
import type { EnvConfig } from '@config/env'

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

export class GeminiApiAdapter implements AiProviderPort {
  constructor(private readonly config: EnvConfig) {}

  async complete(prompt: string): Promise<string> {
    const response = await fetch(
      `${this.config.VITE_AI_BASE_URL}/models/${this.config.VITE_AI_MODEL_NAME}:generateContent?key=${this.config.VITE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: this.config.VITE_AI_TEMPERATURE,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(this.config.VITE_AI_TIMEOUT_MS),
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
