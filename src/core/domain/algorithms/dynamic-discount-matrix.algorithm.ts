export interface DiscountRule { minimumUnits: number; minimumDaysToExpire: number; percentage: number }
export const calculateDiscount = (units: number, daysToExpire: number, rules: DiscountRule[]): number => rules.filter((rule) => units >= rule.minimumUnits && daysToExpire <= rule.minimumDaysToExpire).reduce((max, rule) => Math.max(max, rule.percentage), 0)
