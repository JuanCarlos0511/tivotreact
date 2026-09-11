import type { TelemetryEvent, SurveyAnswers, TelemetrySession } from '../../types/telemetry';

const API_URL = import.meta.env.VITE_TELEMETRY_API_URL || '';

export class TelemetryClient {
  private async request<T>(endpoint: string, method: string, data: unknown): Promise<T | null> {
    if (!API_URL) return null;
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
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
    if (!API_URL) return false;
    try {
      await this.request('/api/v1/telemetry/batch', 'POST', { events });
      return true;
    } catch {
      return false;
    }
  }

  async submitSurvey(data: SurveyAnswers & { session_id: string; participant_id?: string; raw_answers?: Record<string, unknown> | SurveyAnswers }): Promise<boolean> {
    if (!API_URL) return false;
    try {
      await this.request('/api/v1/telemetry/survey', 'POST', data);
      return true;
    } catch {
      return false;
    }
  }
}

export const telemetryClient = new TelemetryClient();
