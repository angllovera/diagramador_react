// src/api/ai.js
export async function actOnDiagram(payload) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/diagram/act`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data; // { aiRunId, ops: [...] }
}
