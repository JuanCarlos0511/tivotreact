import type { AiProviderPort } from '../../domain/ports/ai-provider.port'
import type { PosQueryRequest } from '../dto/pos-query-request.dto'
import type { PosQueryResponse } from '../dto/pos-query-response.dto'

export class ProcessPosUserQueryUseCase {
  constructor(private readonly aiProvider: AiProviderPort) {}

  async execute(request: PosQueryRequest): Promise<PosQueryResponse> {
    const answer = await this.aiProvider.complete(request.query)
    return { intent: null, answer, algorithmUsed: false }
  }
}
