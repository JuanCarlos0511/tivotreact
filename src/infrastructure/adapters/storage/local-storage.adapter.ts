export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export class LocalStorageAdapter {
  constructor(private readonly storage: KeyValueStorage) {}
  get(key: string): string | null { return this.storage.getItem(key) }
  set(key: string, value: string): void { this.storage.setItem(key, value) }
}
