import type { Sku } from '../value-objects/sku.vo'

export interface InventorySnapshot { sku: Sku; expectedUnits: number; countedUnits: number; observedAt: string }
