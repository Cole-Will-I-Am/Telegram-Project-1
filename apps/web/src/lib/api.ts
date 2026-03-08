const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private headers(): HeadersInit {
    const h: HeadersInit = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: this.headers() });
    if (!res.ok) throw await this.error(res);
    return res.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw await this.error(res);
    return res.json();
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await this.error(res);
    return res.json();
  }

  async del(path: string): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) throw await this.error(res);
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const h: HeadersInit = {};
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: h,
      body: formData,
    });
    if (!res.ok) throw await this.error(res);
    return res.json();
  }

  streamUrl(path: string): string {
    return `${API_URL}${path}`;
  }

  getToken(): string | null {
    return this.token;
  }

  private async error(res: Response) {
    try {
      const body = await res.json();
      return new Error(body.message || body.error || res.statusText);
    } catch {
      return new Error(res.statusText);
    }
  }
}

export const api = new ApiClient();
