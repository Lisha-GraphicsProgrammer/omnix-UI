// Base URL comes from environment; falls back to local dev backend.
// Set VITE_API_URL in .env (and in your host's env vars when deploying).
/// <reference types="vite/client" />
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('omnix_token')

  const headers: HeadersInit = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    localStorage.removeItem('omnix_token')
    window.location.href = '/login'
    throw new Error('Unauthorized — redirecting to login')
  }

  return res
}

// ── Extracts the backend's actual error message instead of just the status
// code. FastAPI's HTTPException bodies look like {"detail": "..."} — if the
// body parses as JSON and has a `detail` string, surface that verbatim (e.g.
// "review_status must be one of: reviewed, false_positive, dismissed"
// instead of a bare "400"). If the body isn't valid JSON (a raw 500 traceback
// page, an empty body, a gateway error page, etc.) fall back to a clear
// "invalid response" message that names the status code, rather than trying
// to parse something that was never JSON in the first place. ──
async function extractErrorMessage(res: Response, path: string): Promise<string> {
  const rawText = await res.text().catch(() => '')

  if (!rawText || !rawText.trim()) {
    return `${path} failed: ${res.status} ${res.statusText || ''}`.trim()
  }

  try {
    const parsed = JSON.parse(rawText)
    if (parsed && typeof parsed.detail === 'string') {
      return parsed.detail
    }
    if (parsed && parsed.detail) {
      return JSON.stringify(parsed.detail)
    }
    // Valid JSON but no `detail` field — show the status plus whatever came back.
    return `${path} failed: ${res.status} ${res.statusText || ''}`.trim()
  } catch {
    // Body wasn't valid JSON at all (e.g. a raw 500 HTML/traceback page) —
    // this is the "400 vs invalid JSON" split: a 400 always carries a clean
    // {"detail": ...} body from our own validation, so only a non-JSON body
    // on something like a 500/502 falls into this branch.
    return `${path} failed: ${res.status} ${res.statusText || ''}`.trim()
  }
}

export async function apiGet(path: string) {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(await extractErrorMessage(res, `GET ${path}`))
  return res.json()
}

export async function apiPost(path: string, body?: any) {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await extractErrorMessage(res, `POST ${path}`))
  return res.json()
}

export async function apiDelete(path: string) {
  const res = await apiFetch(path, { method: 'DELETE' })
  if (!res.ok) throw new Error(await extractErrorMessage(res, `DELETE ${path}`))
  return res.json()
}

export async function apiPut(path: string, body?: any) {
  const res = await apiFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await extractErrorMessage(res, `PUT ${path}`))
  return res.json()
}