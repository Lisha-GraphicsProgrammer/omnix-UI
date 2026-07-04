import { API_BASE } from "../lib/api";

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: { id: number; email: string; name: string; role: string; site_id?: number };
}

async function authPost(path: string, body: object, fallbackError: string): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Network-level failure (backend down, CORS, etc.)
    throw new Error("NETWORK");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || fallbackError);
  }
  return res.json();
}

export function loginRequest(email: string, password: string) {
  return authPost("/api/auth/login", { email, password }, "Invalid email or password");
}

export function registerRequest(name: string, email: string, password: string, siteName: string) {
  return authPost("/api/auth/register", { name, email, password, site_name: siteName }, "Registration failed");
}
