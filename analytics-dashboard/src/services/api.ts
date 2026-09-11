import type { 
  OverviewMetrics, LearningCurveLevel, ScaffoldingItem, 
  ErrorTaxonomy, SurveySummary, ParticipantsResponse 
} from '../types/analytics';

const RAW_API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_TELEMETRY_API_URL || 'http://localhost:8000/api/v1').trim().replace(/\/+$/, '');

function getBaseUrl(): string {
  if (RAW_API_URL.endsWith('/api/v1')) {
    return RAW_API_URL;
  }
  return `${RAW_API_URL}/api/v1`;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('tivot_analytics_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('tivot_analytics_token', token);
    } else {
      localStorage.removeItem('tivot_analytics_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new Error('Sesión expirada o credenciales no válidas');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Error de servidor HTTP ${response.status}`);
    }

    return response.json();
  }

  async login(password: string): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    const data = await this.request<{ access_token: string; token_type: string; expires_in: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getOverview(condition?: string): Promise<OverviewMetrics> {
    const query = condition && condition !== 'Todos' ? `?condition=${encodeURIComponent(condition)}` : '';
    return this.request<OverviewMetrics>(`/analytics/overview${query}`);
  }

  async getLearningCurve(condition?: string): Promise<LearningCurveLevel[]> {
    const query = condition && condition !== 'Todos' ? `?condition=${encodeURIComponent(condition)}` : '';
    return this.request<LearningCurveLevel[]>(`/analytics/learning-curve${query}`);
  }

  async getScaffoldingEfficacy(condition?: string): Promise<ScaffoldingItem[]> {
    const query = condition && condition !== 'Todos' ? `?condition=${encodeURIComponent(condition)}` : '';
    return this.request<ScaffoldingItem[]>(`/analytics/scaffolding${query}`);
  }

  async getErrorTaxonomy(condition?: string): Promise<ErrorTaxonomy> {
    const query = condition && condition !== 'Todos' ? `?condition=${encodeURIComponent(condition)}` : '';
    return this.request<ErrorTaxonomy>(`/analytics/errors${query}`);
  }

  async getSurveySummary(condition?: string): Promise<SurveySummary> {
    const query = condition && condition !== 'Todos' ? `?condition=${encodeURIComponent(condition)}` : '';
    return this.request<SurveySummary>(`/analytics/surveys${query}`);
  }

  async getParticipants(page = 1, pageSize = 20, condition?: string): Promise<ParticipantsResponse> {
    const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
    if (condition && condition !== 'Todos') {
      params.append('condition', condition);
    }
    return this.request<ParticipantsResponse>(`/analytics/participants?${params.toString()}`);
  }

  async downloadExport(format: 'csv_flat' | 'csv_summary' | 'jsonl' | 'xlsx'): Promise<void> {
    const baseUrl = getBaseUrl();
    let endpoint = '';
    let defaultFilename = '';

    switch (format) {
      case 'csv_flat':
        endpoint = '/analytics/export?format=csv';
        defaultFilename = 'telemetry_events.csv';
        break;
      case 'csv_summary':
        endpoint = '/export/csv?type=summary_by_student';
        defaultFilename = 'student_metrics_summary.csv';
        break;
      case 'jsonl':
        endpoint = '/analytics/export?format=jsonl';
        defaultFilename = 'telemetry_data.jsonl';
        break;
      case 'xlsx':
        endpoint = '/export/xlsx';
        defaultFilename = 'tivot_research_dataset.xlsx';
        break;
    }

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${baseUrl}${endpoint}`, { headers });
    if (!res.ok) {
      throw new Error(`Error en la descarga (${res.status})`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const api = new ApiService();
