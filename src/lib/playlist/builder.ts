import { Candidate } from '../../stubs/metadata.js';

export interface PlaylistOptions {
  topic: string;
  targetDurationSec: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  candidates: Candidate[];
}

export interface PlaylistVideo {
  videoId: string;
  title: string;
  durationSec: number;
  channelTitle: string;
  thumbnail: string;
}

export interface Playlist {
  id: string;
  topic: string;
  difficulty: string;
  totalDurationSec: number;
  videos: PlaylistVideo[];
}

type PackedCombination = {
  totalDuration: number;
  indices: number[];
};

const SELECTED_ID_PREFIX = 'pl_';

export async function buildPlaylist({
  topic,
  targetDurationSec,
  difficulty,
  candidates
}: PlaylistOptions): Promise<Playlist | null> {
  if (!candidates.length) return null;

  const padding = Math.max(180, Math.floor(targetDurationSec * 0.15));
  const maxDuration = Math.max(targetDurationSec + padding, targetDurationSec); // allow slight overshoot

  const withinWindow = candidates.filter((candidate) => candidate.durationSec <= maxDuration);
  const difficultyMatched = withinWindow.filter((candidate) => candidate.level === difficulty);

  const candidatePool = (difficultyMatched.length ? difficultyMatched : withinWindow.length ? withinWindow : candidates)
    .map((candidate, index) => ({ candidate, originalIndex: index }))
    .sort((a, b) => a.candidate.durationSec - b.candidate.durationSec); // start with shorter videos

  if (!candidatePool.length) return null;

  const combinations = new Map<number, PackedCombination>();
  combinations.set(0, { totalDuration: 0, indices: [] });

  candidatePool.forEach((entry, poolIndex) => {
    const { candidate } = entry;
    const currentEntries = Array.from(combinations.entries()).sort((a, b) => b[0] - a[0]);
    currentEntries.forEach(([duration, combination]) => {
      const newDuration = duration + candidate.durationSec;
      if (newDuration > maxDuration) {
        return;
      }

      const existing = combinations.get(newDuration);
      if (!existing || existing.totalDuration < newDuration) {
        combinations.set(newDuration, {
          totalDuration: newDuration,
          indices: [...combination.indices, poolIndex]
        });
      }
    });
  });

  const chooseBestCombination = (): PackedCombination | undefined => {
    let bestUnderTarget: PackedCombination | undefined;
    let bestOverTarget: PackedCombination | undefined;

    combinations.forEach((combination, duration) => {
      if (duration === 0) return;
      if (duration <= targetDurationSec) {
        if (!bestUnderTarget || combination.totalDuration > bestUnderTarget.totalDuration) {
          bestUnderTarget = combination;
        }
      } else if (duration <= maxDuration) {
        if (!bestOverTarget || combination.totalDuration < bestOverTarget.totalDuration) {
          bestOverTarget = combination;
        }
      }
    });

    return bestUnderTarget ?? bestOverTarget;
  };

  const selectedCombination = chooseBestCombination();

  const buildVideoRecord = (candidate: Candidate): PlaylistVideo => ({
    videoId: candidate.videoId,
    title: candidate.title || `${candidate.topic} Tutorial`,
    durationSec: candidate.durationSec,
    channelTitle: candidate.channelTitle || 'Unknown Channel',
    thumbnail: candidate.thumbnail || ''
  });

  let selectedVideos: PlaylistVideo[] = [];

  if (selectedCombination && selectedCombination.indices.length) {
    selectedVideos = selectedCombination.indices
      .map((index) => candidatePool[index]?.candidate)
      .filter((candidate): candidate is Candidate => Boolean(candidate))
      .map((candidate) => buildVideoRecord(candidate));
  } else {
    const fallbackCandidate = candidatePool.at(0)?.candidate ?? candidates.at(0);
    if (!fallbackCandidate) {
      return null;
    }
    selectedVideos = [buildVideoRecord(fallbackCandidate)];
  }

  const totalDuration = selectedVideos.reduce((sum, video) => sum + video.durationSec, 0);

  return {
    id: `${SELECTED_ID_PREFIX}${Date.now()}_${topic.toLowerCase().replace(/\s+/g, '-')}`,
    topic,
    difficulty,
    totalDurationSec: totalDuration,
    videos: selectedVideos
  };
}
