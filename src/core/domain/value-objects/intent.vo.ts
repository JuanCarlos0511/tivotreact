export const PosIntent = {
  StockReconciliation: 'stock-reconciliation',
  ShrinkageDetection: 'shrinkage-detection',
  DynamicDiscount: 'dynamic-discount',
  CashRegisterAudit: 'cash-register-audit',
} as const

export type PosIntent = (typeof PosIntent)[keyof typeof PosIntent]
