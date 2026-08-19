import type { Sku } from '../value-objects/sku.vo'

export interface Product { sku: Sku; name: string; unitCost: number; active: boolean }
