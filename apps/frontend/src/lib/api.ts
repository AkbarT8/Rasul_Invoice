const API_PROXY = "/api/proxy";

type ApiOptions = RequestInit & {
  skipRefresh?: boolean;
};

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

async function ensureCsrfToken() {
  let token = readCookie("csrf_token");
  if (!token) {
    const response = await fetch(`${API_PROXY}/auth/csrf`, { credentials: "include" });
    const data = (await response.json()) as { token?: string };
    token = data.token;
  }
  return token;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method?.toUpperCase() ?? "GET";
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await ensureCsrfToken();
    if (csrf) headers.set("x-csrf-token", csrf);
  }

  const response = await fetch(`${API_PROXY}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include"
  });

  if (response.status === 401 && !options.skipRefresh) {
    const refresh = await fetch(`${API_PROXY}/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });
    if (refresh.ok) {
      return apiFetch<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return (await response.json()) as T;
  return (await response.blob()) as T;
}

export function downloadUrl(path: string) {
  return `${API_PROXY}${path}`;
}
