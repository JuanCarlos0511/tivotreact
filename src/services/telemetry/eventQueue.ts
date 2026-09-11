import type { TelemetryEvent, QueueStatus } from '../../types/telemetry';
import { indexedDbStorage } from './indexedDbStorage';
import { telemetryClient } from './telemetryClient';
import { exportService } from './exportService';

export class TelemetryEventQueue {
  private isEnabled = true;
  private isProcessing = false;
  private retryDelayMs = 2000;
  private maxRetryDelayMs = 30000;
  private timer: number | null = null;
  private syncedCount = 0;
  private failedCount = 0;
  private lastSyncAt: string | null = null;

  constructor() {
    this.scheduleNextProcess();
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  async enqueue(event: TelemetryEvent) {
    if (!this.isEnabled) return;
    await indexedDbStorage.addEvent(event);
    
    const count = await indexedDbStorage.getEventCount();
    const isCritical = ['LEVEL_COMPLETE', 'SESSION_START', 'SURVEY_SUBMITTED'].includes(event.event_type);
    
    if (count >= 10 || isCritical) {
      this.flush();
    }
  }

  async flush() {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    await this.processBatch();
  }

  private async processBatch() {
    if (this.isProcessing || !this.isEnabled) return;
    
    this.isProcessing = true;
    try {
      const allEvents = await indexedDbStorage.getAllEvents();
      if (allEvents.length === 0) {
        this.isProcessing = false;
        return;
      }

      const batch = allEvents.slice(0, 100);
      const success = await telemetryClient.sendBatch(batch);
      
      if (success) {
        await indexedDbStorage.removeEvents(batch.map(e => e.id));
        this.syncedCount += batch.length;
        this.lastSyncAt = new Date().toISOString();
        this.retryDelayMs = 2000; // reset
        
        const remaining = await indexedDbStorage.getEventCount();
        if (remaining > 0) {
          this.scheduleNextProcess(100);
        }
      } else {
        this.handleFailure();
      }
    } catch {
      this.handleFailure();
    } finally {
      this.isProcessing = false;
    }
  }

  private handleFailure() {
    this.failedCount++;
    this.retryDelayMs = Math.min(this.retryDelayMs * 2, this.maxRetryDelayMs);
    const jitter = Math.random() * 1000;
    this.scheduleNextProcess(this.retryDelayMs + jitter);
  }

  private scheduleNextProcess(delayMs = 10000) {
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(async () => {
      const count = await indexedDbStorage.getEventCount();
      if (count > 0) {
        await this.processBatch();
      }
      this.scheduleNextProcess(); // loop
    }, delayMs);
  }

  async getStatus(): Promise<QueueStatus> {
    return {
      pending: await indexedDbStorage.getEventCount(),
      synced: this.syncedCount,
      failed: this.failedCount,
      lastSyncAt: this.lastSyncAt
    };
  }

  async downloadAsCSV() {
    const events = await indexedDbStorage.getAllEvents();
    const csv = exportService.exportEventsAsCSV(events);
    exportService.downloadFile(csv, `telemetry_export_${Date.now()}.csv`, 'text/csv');
  }

  async downloadAsJSONL() {
    const events = await indexedDbStorage.getAllEvents();
    const jsonl = exportService.exportEventsAsJSONL(events);
    exportService.downloadFile(jsonl, `telemetry_export_${Date.now()}.jsonl`, 'application/jsonl');
  }
}

export const eventQueue = new TelemetryEventQueue();
