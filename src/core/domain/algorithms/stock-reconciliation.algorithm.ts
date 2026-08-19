import type { InventorySnapshot } from '../entities/inventory.entity'

export interface StockReconciliation { sku: string; difference: number; status: 'balanced' | 'shortage' | 'surplus' }

export const reconcileStock = (snapshot: InventorySnapshot): StockReconciliation => {
  const difference = snapshot.countedUnits - snapshot.expectedUnits
  return { sku: snapshot.sku.value, difference, status: difference === 0 ? 'balanced' : difference < 0 ? 'shortage' : 'surplus' }
}
