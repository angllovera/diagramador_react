// src/api/generate.js
export async function generateSpringBootZip({ model, groupId = 'com.example', artifactId = 'app' }) {
  const token = localStorage.getItem('token'); // ajusta si guardas el token en otro lado

  const res = await fetch('/api/generate/springboot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ model, groupId, artifactId }),
  });

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return await res.blob(); // <-- ZIP
}
