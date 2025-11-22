const BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "http://backend:3000";

export async function apiClient(
  path: string,
  options: RequestInit = {}
) {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(`API Error ${res.status}: ${message}`);
  }

  if (res.status === 204) return null;

  return res.json();
}
