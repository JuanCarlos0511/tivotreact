import type { PosIntent } from '../../domain/value-objects/intent.vo'

export interface PosQueryResponse { intent: PosIntent | null; answer: string; algorithmUsed: boolean }
