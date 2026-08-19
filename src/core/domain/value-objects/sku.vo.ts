export class Sku {
  readonly value: string

  constructor(value: string) {
    const normalizedValue = value.trim().toUpperCase()
    if (!normalizedValue) throw new Error('El SKU no puede estar vacío')
    this.value = normalizedValue
  }
}
