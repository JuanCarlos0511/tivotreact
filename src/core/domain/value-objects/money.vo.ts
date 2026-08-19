export class Money {
  readonly amount: number
  readonly currency: string

  constructor(amount: number, currency = 'MXN') {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('El importe debe ser un número positivo')
    this.amount = Math.round(amount * 100) / 100
    this.currency = currency
  }

  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error('No se pueden mezclar monedas')
    return new Money(this.amount + other.amount, this.currency)
  }
}
