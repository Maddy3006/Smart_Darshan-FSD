import env from '../config/env.js';

/** Thin HTTP client for the Python prediction service (ml-service/). */
async function call(path, { method = 'GET', body, timeoutMs = 8000 } = {}) {
  const res = await fetch(`${env.mlServiceUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(env.mlApiKey ? { 'X-Api-Key': env.mlApiKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Prediction service responded with ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function mlHealth() {
  try {
    return { online: true, ...(await call('/health', { timeoutMs: 2000 })) };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

export function mlTrain(templeId, records) {
  return call('/train', { method: 'POST', body: { templeId, records }, timeoutMs: 120_000 });
}

export function mlPredict(templeId, rows) {
  return call('/predict', { method: 'POST', body: { templeId, rows } });
}
