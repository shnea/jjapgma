export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let csrfToken = '';
export function setCsrf(value: string) {
  csrfToken = value;
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, ...options.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.message || '요청을 처리하지 못했습니다.');
  }
  return response.json();
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '문제가 발생했습니다. 다시 시도해 주세요.';
export type User = { id: string; displayName: string; csrfToken: string };
export type Project = {
  id: string;
  name: string;
  description: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  pageCount: number;
  updated_at: string;
};
