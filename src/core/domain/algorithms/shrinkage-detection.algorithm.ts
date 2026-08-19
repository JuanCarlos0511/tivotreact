export interface ShrinkageSample { sku: string; soldUnits: number; expectedUnits: number; countedUnits: number }
export interface ShrinkageAlert extends ShrinkageSample { lossRate: number; severity: 'low' | 'medium' | 'high' }

export const detectShrinkage = (sample: ShrinkageSample): ShrinkageAlert => {
  const missingUnits = Math.max(0, sample.expectedUnits - sample.countedUnits)
  const lossRate = sample.expectedUnits === 0 ? 0 : missingUnits / sample.expectedUnits
  return { ...sample, lossRate, severity: lossRate >= 0.1 ? 'high' : lossRate >= 0.03 ? 'medium' : 'low' }
}
