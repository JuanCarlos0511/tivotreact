import type { TelemetryEvent } from '../../types/telemetry';

const DB_NAME = 'tivot_telemetry_db';
const LEGACY_STORE_NAME = 'pending_events';
const STORE_NAME = 'pending_events_v2';
const FALLBACK_KEY = 'tivot_telemetry_fallback';
const DB_VERSION = 2;

export class IndexedDbStorage {
  private db: IDBDatabase | null = null;
  private useFallback = false;
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    if (!window.indexedDB) {
      this.useFallback = true;
      return;
    }
    await new Promise<void>((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => { this.useFallback = true; resolve(); };
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'event_id' });
        }
      };
    });
    if (this.db) {
      await this.migrateLegacyEvents();
      await this.migrateFallbackEvents();
    }
  }

  async addEvent(event: TelemetryEvent): Promise<void> {
    await this.ready;
    if (this.useFallback || !this.db) {
      this.saveFallbackEvents(this.mergeById(this.getFallbackEvents(), [event]));
      return;
    }
    await this.writeEvents([event]);
  }

  async getAllEvents(): Promise<TelemetryEvent[]> {
    await this.ready;
    if (this.useFallback || !this.db) return sortEvents(this.getFallbackEvents());
    return new Promise((resolve) => {
      const request = this.db!.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(sortEvents(request.result ?? []));
      request.onerror = () => resolve(sortEvents(this.getFallbackEvents()));
    });
  }

  async removeEvents(ids: string[]): Promise<void> {
    await this.ready;
    const idSet = new Set(ids);
    this.saveFallbackEvents(this.getFallbackEvents().filter((event) => !idSet.has(event.event_id)));
    if (this.useFallback || !this.db) return;
    await new Promise<void>((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      ids.forEach((id) => store.delete(id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    });
  }

  async getEventCount(): Promise<number> {
    return (await this.getAllEvents()).length;
  }

  async clearAll(): Promise<void> {
    await this.ready;
    this.saveFallbackEvents([]);
    if (!this.db) return;
    await new Promise<void>((resolve) => {
      const request = this.db!.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  private async migrateFallbackEvents(): Promise<void> {
    const events = this.getFallbackEvents();
    if (!events.length) return;
    await this.writeEvents(events);
    this.saveFallbackEvents([]);
  }

  private async migrateLegacyEvents(): Promise<void> {
    if (!this.db?.objectStoreNames.contains(LEGACY_STORE_NAME)) return;
    const legacy = await new Promise<unknown[]>((resolve) => {
      const request = this.db!.transaction(LEGACY_STORE_NAME, 'readonly').objectStore(LEGACY_STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => resolve([]);
    });
    const migrated = legacy.map(normalizeEvent).filter((event): event is TelemetryEvent => event !== null);
    if (!migrated.length) return;
    await this.writeEvents(migrated);
    await new Promise<void>((resolve) => {
      const request = this.db!.transaction(LEGACY_STORE_NAME, 'readwrite').objectStore(LEGACY_STORE_NAME).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  private writeEvents(events: TelemetryEvent[]): Promise<void> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      events.forEach((event) => store.put(event));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        this.saveFallbackEvents(this.mergeById(this.getFallbackEvents(), events));
        resolve();
      };
      transaction.onabort = () => {
        this.saveFallbackEvents(this.mergeById(this.getFallbackEvents(), events));
        resolve();
      };
    });
  }

  private mergeById(current: TelemetryEvent[], incoming: TelemetryEvent[]): TelemetryEvent[] {
    return [...new Map([...current, ...incoming].map((event) => [event.event_id, event])).values()];
  }

  private getFallbackEvents(): TelemetryEvent[] {
    try {
      const data = localStorage.getItem(FALLBACK_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeEvent).filter((event): event is TelemetryEvent => event !== null);
    } catch {
      return [];
    }
  }

  private saveFallbackEvents(events: TelemetryEvent[]): void {
    try {
      if (events.length) localStorage.setItem(FALLBACK_KEY, JSON.stringify(events));
      else localStorage.removeItem(FALLBACK_KEY);
    } catch {
      // Sin almacenamiento disponible, se conserva la experiencia de aprendizaje.
    }
  }
}

export const indexedDbStorage = new IndexedDbStorage();

const legacyEventTypes: Record<string, TelemetryEvent['event_type']> = {
  SESSION_START: 'session_started',
  LEVEL_START: 'level_started',
  LEVEL_COMPLETE: 'level_completed',
  CODE_EXECUTION_ATTEMPT: 'code_run',
  ERROR_ENCOUNTERED: 'code_run',
  AI_HINT_REQUESTED: 'ai_hint_requested',
  IDLE_PERIOD_DETECTED: 'idle_detected',
  SURVEY_SUBMITTED: 'survey_submitted',
};

const canonicalEventTypes = new Set<TelemetryEvent['event_type']>([
  'session_started', 'level_started', 'code_run', 'syntax_error',
  'ai_hint_requested', 'level_completed', 'idle_detected', 'survey_submitted',
]);

function sortEvents(events: TelemetryEvent[]): TelemetryEvent[] {
  return [...events].sort((left, right) => {
    if (left.event_type === 'session_started' && right.event_type !== 'session_started') return -1;
    if (right.event_type === 'session_started' && left.event_type !== 'session_started') return 1;
    return left.timestamp.localeCompare(right.timestamp);
  });
}

function normalizeEvent(value: unknown): TelemetryEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;
  const mappedType = typeof event.event_type === 'string' ? legacyEventTypes[event.event_type] ?? event.event_type : null;
  const eventType = mappedType && canonicalEventTypes.has(mappedType as TelemetryEvent['event_type'])
    ? mappedType as TelemetryEvent['event_type']
    : null;
  const eventId = typeof event.event_id === 'string' ? event.event_id : typeof event.id === 'string' ? event.id : null;
  const timestamp = typeof event.timestamp === 'string' ? event.timestamp : typeof event.created_at === 'string' ? event.created_at : null;
  if (!eventId || !eventType || !timestamp || typeof event.session_id !== 'string' || typeof event.participant_id !== 'string' || typeof event.level_id !== 'number') return null;
  const normalized = { ...event };
  delete normalized.id;
  delete normalized.created_at;
  return { ...normalized, event_id: eventId, event_type: eventType, timestamp } as TelemetryEvent;
}
