import type { QueueStatus, TelemetryEvent } from '../../types/telemetry';
import { exportService } from './exportService';
import { indexedDbStorage } from './indexedDbStorage';
import { telemetryClient } from './telemetryClient';

const BATCH_SIZE = 100;
const FLUSH_THRESHOLD = 10;
const BASE_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;

export class TelemetryEventQueue {
  private isEnabled = true;
  private isProcessing = false;
  private retryDelayMs = BASE_RETRY_MS;
  private timer: number | null = null;
  private syncedCount = 0;
  private failedCount = 0;
  private lastSyncAt: string | null = null;

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('pagehide', this.handlePageHide);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.schedule(10_000);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) void this.flush();
  }

  async enqueue(event: TelemetryEvent): Promise<void> {
    if (!this.isEnabled) return;
    await indexedDbStorage.addEvent(event);
    const critical = ['session_started', 'level_completed', 'survey_submitted'].includes(event.event_type);
    if (critical || await indexedDbStorage.getEventCount() >= FLUSH_THRESHOLD) void this.flush();
  }

  async flush(keepalive = false): Promise<void> {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    await this.processBatch(keepalive);
  }

  private readonly handleOnline = () => { void this.flush(); };
  private readonly handlePageHide = () => { void this.flush(true); };
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') void this.flush(true);
  };

  private async processBatch(keepalive: boolean): Promise<void> {
    if (this.isProcessing || !this.isEnabled) return;
    this.isProcessing = true;
    try {
      const batch = (await indexedDbStorage.getAllEvents()).slice(0, BATCH_SIZE);
      if (!batch.length) return;
      if (await telemetryClient.sendBatch(batch, keepalive)) {
        await indexedDbStorage.removeEvents(batch.map((event) => event.event_id));
        this.syncedCount += batch.length;
        this.lastSyncAt = new Date().toISOString();
        this.retryDelayMs = BASE_RETRY_MS;
        if (await indexedDbStorage.getEventCount()) this.schedule(100);
      } else {
        this.registerFailure();
      }
    } catch {
      this.registerFailure();
    } finally {
      this.isProcessing = false;
      if (this.timer === null) this.schedule(10_000);
    }
  }

  private registerFailure(): void {
    this.failedCount += 1;
    this.retryDelayMs = Math.min(this.retryDelayMs * 2, MAX_RETRY_MS);
    this.schedule(this.retryDelayMs + Math.random() * 1_000);
  }

  private schedule(delayMs: number): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      void this.processBatch(false);
    }, delayMs);
  }

  async getStatus(): Promise<QueueStatus> {
    return {
      pending: await indexedDbStorage.getEventCount(),
      synced: this.syncedCount,
      failed: this.failedCount,
      lastSyncAt: this.lastSyncAt,
    };
  }

  async downloadAsCSV(): Promise<void> {
    exportService.downloadFile(exportService.exportEventsAsCSV(await indexedDbStorage.getAllEvents()), `telemetry_export_${Date.now()}.csv`, 'text/csv');
  }

  async downloadAsJSONL(): Promise<void> {
    exportService.downloadFile(exportService.exportEventsAsJSONL(await indexedDbStorage.getAllEvents()), `telemetry_export_${Date.now()}.jsonl`, 'application/x-ndjson');
  }
}

export const eventQueue = new TelemetryEventQueue();
