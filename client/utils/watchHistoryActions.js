import { buildApiUrl, getAuthHeaders } from '../config/api';

const API_BASE = buildApiUrl();

export async function recordWatchAgain(user, video) {
  if (!user) return;

  const authHeaders = await getAuthHeaders(user);
  const nowIso = new Date().toISOString();
  const payload = {
    userId: user.uid,
    videoId: video.videoId,
    title: video.title,
    durationSec: video.durationSec || 0,
    topicTags: video.topicTags || [],
    startedAt: nowIso,
    completedAt: nowIso,
    progressPct: 100,
    source: video.source || 'youtube',
    ...(video.channelTitle && { channelTitle: video.channelTitle }),
    ...(video.thumbnail && { thumbnail: video.thumbnail })
  };

  const response = await fetch(`${API_BASE}/api/history/watch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Failed to update watch history');
    throw new Error(errText || 'Failed to update watch history');
  }

  return response;
}
