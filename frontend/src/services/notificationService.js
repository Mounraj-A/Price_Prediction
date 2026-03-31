/**
 * Backend notification API (Spring Boot). Uses same token key as the rest of the app.
 */
const BASE = "http://localhost:8080/api/notifications";

function authHeaders() {
  const token = localStorage.getItem("omni_token");
  const h = { Accept: "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchNotifications() {
  const response = await fetch(BASE, {
    headers: authHeaders(),
  });
  if (response.status === 401) {
    return [];
  }
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function markNotificationRead(id) {
  const response = await fetch(`${BASE}/read/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (response.status === 401 || !response.ok) {
    return null;
  }
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return null;
  }
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
