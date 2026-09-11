import type { SurveyAnswers, TelemetryEvent, TelemetrySession } from '../../types/telemetry';

const RAW_API_URL = (import.meta.env.VITE_TELEMETRY_API_URL || '').trim().replace(/\/+$/, '');
const CLIENT_KEY = (import.meta.env.VITE_TELEMETRY_CLIENT_KEY || '').trim();
const REQUEST_TIMEOUT_MS = 8_000;

function buildUrl(endpoint: string): string {
  if (!RAW_API_URL) return '';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (RAW_API_URL.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1/')) {
    return `${RAW_API_URL}${cleanEndpoint.slice(7)}`;
  }
  return `${RAW_API_URL}${cleanEndpoint}`;
}

export class TelemetryClient {
  private async request<T>(endpoint: string, data: unknown, keepalive = false): Promise<T | null> {
    const fullUrl = buildUrl(endpoint);
    if (!fullUrl) return null;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(CLIENT_KEY ? { 'X-Telemetry-Client-Key': CLIENT_KEY } : {}),
        },
        body: JSON.stringify(data),
        keepalive,
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return await response.json() as T;
    } catch {
      // La telemetría nunca debe interrumpir la práctica del estudiante.
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  createSession(session: TelemetrySession): Promise<{ session_id: string } | null> {
    return this.request('/api/v1/telemetry/session', session);
  }

  async sendBatch(events: TelemetryEvent[], keepalive = false): Promise<boolean> {
    if (!RAW_API_URL) return false;
    return (await this.request('/api/v1/telemetry/events', { events }, keepalive)) !== null;
  }

  async submitSurvey(
    data: SurveyAnswers & { session_id: string; participant_id: string },
  ): Promise<boolean> {
    if (!RAW_API_URL) return false;
    return (await this.request('/api/v1/telemetry/survey', {
      ...data,
      raw_answers: data,
    })) !== null;
  }
}

export const telemetryClient = new TelemetryClient();
