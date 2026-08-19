import type { InventorySnapshot } from '../entities/inventory.entity'

export interface PosRepositoryPort { getInventorySnapshot(sku: string): Promise<InventorySnapshot | null> }
