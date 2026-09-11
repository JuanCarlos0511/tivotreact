import type { TelemetryEvent, SurveyAnswers, TelemetrySession } from '../../types/telemetry';

const RAW_API_URL = (import.meta.env.VITE_TELEMETRY_API_URL || '').trim().replace(/\/+$/, '');
const CLIENT_KEY = (import.meta.env.VITE_TELEMETRY_CLIENT_KEY || '').trim();

function buildUrl(endpoint: string): string {
  if (!RAW_API_URL) return '';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (RAW_API_URL.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1/')) {
    return `${RAW_API_URL}${cleanEndpoint.slice(7)}`;
  }
  return `${RAW_API_URL}${cleanEndpoint}`;
}

export class TelemetryClient {
  private async request<T>(endpoint: string, method: string, data: unknown): Promise<T | null> {
    const fullUrl = buildUrl(endpoint);
    if (!fullUrl) return null;
    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(CLIENT_KEY ? { 'X-Telemetry-Client-Key': CLIENT_KEY } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Telemetry API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  async createSession(data: Omit<TelemetrySession, 'id' | 'started_at'>): Promise<{ id: string } | null> {
    return this.request<{ id: string }>('/api/v1/telemetry/session', 'POST', data);
  }

  async sendBatch(events: TelemetryEvent[]): Promise<boolean> {
    if (!RAW_API_URL) return false;
    try {
      await this.request('/api/v1/telemetry/batch', 'POST', { events });
      return true;
    } catch {
      return false;
    }
  }

  async submitSurvey(data: SurveyAnswers & { session_id: string; participant_id?: string; raw_answers?: Record<string, unknown> | SurveyAnswers }): Promise<boolean> {
    if (!RAW_API_URL) return false;
    try {
      await this.request('/api/v1/telemetry/survey', 'POST', data);
      return true;
    } catch {
      return false;
    }
  }
}

export const telemetryClient = new TelemetryClient();
