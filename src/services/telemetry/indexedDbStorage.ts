import type { TelemetryEvent } from '../../types/telemetry';

const DB_NAME = 'tivot_telemetry_db';
const STORE_NAME = 'pending_events';
const DB_VERSION = 1;

export class IndexedDbStorage {
  private db: IDBDatabase | null = null;
  private isFallback = false;

  constructor() {
    this.init().catch(err => console.warn('Failed to init IndexedDB, will use fallback', err));
  }

  private async init(): Promise<void> {
    if (!window.indexedDB) {
      this.isFallback = true;
      return;
    }
    
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        this.isFallback = true;
        resolve(); // resolve anyway to avoid breaking
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async addEvent(event: TelemetryEvent): Promise<void> {
    try {
      if (this.isFallback || !this.db) {
        const events = this.getFallbackEvents();
        events.push(event);
        this.saveFallbackEvents(events);
        return;
      }
      
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(event);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
           console.warn('IDB add error, falling back to localStorage');
           const events = this.getFallbackEvents();
           events.push(event);
           this.saveFallbackEvents(events);
           resolve();
        };
      });
    } catch (e) {
      console.error('addEvent error', e);
    }
  }

  async getAllEvents(): Promise<TelemetryEvent[]> {
    try {
      if (this.isFallback || !this.db) {
        return this.getFallbackEvents();
      }
      
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => {
          resolve(this.getFallbackEvents());
        };
      });
    } catch (e) {
      console.error('getAllEvents error', e);
      return [];
    }
  }

  async removeEvents(ids: string[]): Promise<void> {
    try {
      if (this.isFallback || !this.db) {
        let events = this.getFallbackEvents();
        events = events.filter(e => !ids.includes(e.id));
        this.saveFallbackEvents(events);
        return;
      }
      
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        ids.forEach(id => {
          store.delete(id);
        });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          console.warn('Failed to delete some events from IDB');
          resolve();
        };
      });
    } catch (e) {
      console.error('removeEvents error', e);
    }
  }

  async getEventCount(): Promise<number> {
    try {
      if (this.isFallback || !this.db) {
        return this.getFallbackEvents().length;
      }
      
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();
        
        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => resolve(this.getFallbackEvents().length);
      });
    } catch {
      return 0;
    }
  }

  async clearAll(): Promise<void> {
    try {
      this.saveFallbackEvents([]);
      if (this.db) {
        return new Promise((resolve) => {
          const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        });
      }
    } catch (e) {
      console.error('clearAll error', e);
    }
  }

  private getFallbackEvents(): TelemetryEvent[] {
    try {
      const data = localStorage.getItem('tivot_telemetry_fallback');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveFallbackEvents(events: TelemetryEvent[]): void {
    try {
      localStorage.setItem('tivot_telemetry_fallback', JSON.stringify(events));
    } catch {
      // Ignore
    }
  }
}

export const indexedDbStorage = new IndexedDbStorage();
