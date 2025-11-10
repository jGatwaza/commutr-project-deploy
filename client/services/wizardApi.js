import { AUTH_TOKEN, buildApiUrl } from '../config/api';

async function handleResponse(response) {
  if (response.status === 204) {
    return { status: 204 };
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || 'Request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return { status: response.status, payload };
}

export async function fetchWizardRecommendations({ userId, commuteDurationSec, vibe, topic, topicsLearned = [], refreshNonce }) {
  const payload = {
    userId,
    commuteDurationSec,
    vibe,
    topic,
    topicsLearned
  };

  if (refreshNonce) {
    payload.refreshNonce = refreshNonce;
  }

  const response = await fetch(buildApiUrl('/api/wizard/recommendations'), {
    method: 'POST',
    headers: {
      'Authorization': AUTH_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return handleResponse(response);
}

export async function buildWizardPlaylist({ userId, topic, commuteDurationSec, vibe, difficulty, previewVideos = [] }) {
  const response = await fetch(buildApiUrl('/api/wizard/playlist'), {
    method: 'POST',
    headers: {
      'Authorization': AUTH_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, topic, commuteDurationSec, vibe, difficulty, previewVideos })
  });

  return handleResponse(response);
}
