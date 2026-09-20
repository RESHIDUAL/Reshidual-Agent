export const API_BASE = 'http://localhost:8420/api';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const errData = await res.json();
      if (errData.detail) message = errData.detail;
      else if (errData.message) message = errData.message;
    } catch (e) {

    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const options: RequestInit = {
    method: 'POST',
  };
  if (body) {
    if (body instanceof Blob || body instanceof FormData) {
      options.body = body;
    } else {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${API_BASE}${path}`, options);
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return handleResponse<T>(res);
}

export function apiSSE(path: string, onEvent: (data: any) => void): () => void {
  const eventSource = new EventSource(`${API_BASE}${path}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch (e) {
      console.error('Error parsing SSE data', e);
    }
  };

  return () => {
    eventSource.close();
  };
}