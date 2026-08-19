import type { AiProviderPort } from '@domain/ports/ai-provider.port'

export class GeminiApiAdapter implements AiProviderPort {
  async complete(prompt: string): Promise<string> { return `Respuesta simulada para: ${prompt}` }
}
