const BASE_URL = 'https://server.leadpulse.praxiszim.co.zw';
export const AUTH_EXPIRED_EVENT = 'leadpulse:auth-expired';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`Unable to reach API at ${BASE_URL}. Make sure the server is running.`);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export default BASE_URL;
