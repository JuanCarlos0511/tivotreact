import type { TelemetryEvent } from '../../types/telemetry';

export class ExportService {
  exportEventsAsCSV(events: TelemetryEvent[]): string {
    if (events.length === 0) return '';
    const headers = [
      'event_id', 'session_id', 'participant_id', 'level_id', 'step_index',
      'event_type', 'is_success', 'attempt_number', 'active_time_ms',
      'idle_time_ms', 'error_category', 'error_message_snippet',
      'ai_hint_type', 'ai_hint_effective', 'autonomy_score', 'payload', 'timestamp'
    ];
    
    const lines = [headers.join(',')];
    
    for (const event of events) {
      const row = headers.map(header => {
        const val = event[header as keyof TelemetryEvent];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
        return String(val);
      });
      lines.push(row.join(','));
    }
    
    return lines.join('\n');
  }

  exportEventsAsJSONL(events: TelemetryEvent[]): string {
    return events.map(e => JSON.stringify(e)).join('\n');
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const exportService = new ExportService();
