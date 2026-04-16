const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function fetchOverview(): Promise<any> {
  return request('/overview');
}

export function fetchSessions(params?: {
  project?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}): Promise<any> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return request(`/sessions${query ? `?${query}` : ''}`);
}

export function fetchSessionDetail(id: string): Promise<any> {
  return request(`/sessions/${encodeURIComponent(id)}`);
}

export function fetchProjects(): Promise<any> {
  return request('/projects');
}
