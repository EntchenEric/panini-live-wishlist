export interface ApiError {
  error: string;
  ok: false;
  status: number;
}

export interface ApiSuccess<T> {
  data: T;
  ok: true;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export async function apiClient<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { data: data as T, ok: true };
    }

    return { error: data.message || `Request failed with status ${response.status}`, ok: false, status: response.status };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error', ok: false, status: 0 };
  }
}