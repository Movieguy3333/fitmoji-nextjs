import type {
  CompletionRecord,
  HealthMetrics,
  MapNode,
  SessionState,
  StarRating,
} from './types';
import { computeDeltaMetrics, computeNodeRewards, getNodeStarsEarned } from './star-helpers';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function createSession(
  nodeId: number,
  baseline: HealthMetrics,
): SessionState {
  const now = Date.now();
  return {
    nodeId,
    startedAt: now,
    deadlineAt: now + SESSION_DURATION_MS,
    baseline,
  };
}

export function isSessionExpired(session: SessionState): boolean {
  return Date.now() > session.deadlineAt;
}

export function getSessionTimeRemainingMs(session: SessionState): number {
  return Math.max(0, session.deadlineAt - Date.now());
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return `${totalSeconds}s left`;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Compact countdown: ≥1h → H:MM; under 1h → M:SS (compass FAB, menu, etc.). */
export function formatChallengeCountdownMs(msLeft: number): string {
  const ms = Math.max(0, msLeft);
  if (ms >= ONE_HOUR_MS) {
    const h = Math.floor(ms / ONE_HOUR_MS);
    const m = Math.floor((ms % ONE_HOUR_MS) / 60000);
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function getSessionProgress(
  session: SessionState,
  currentMetrics: HealthMetrics,
): HealthMetrics {
  return computeDeltaMetrics(currentMetrics, session.baseline);
}

export function getSessionStars(
  node: MapNode,
  session: SessionState,
  currentMetrics: HealthMetrics,
): StarRating {
  const progress = getSessionProgress(session, currentMetrics);
  return getNodeStarsEarned(node.completionCriteria, progress);
}

export type StartSessionResult =
  | { ok: true; session: SessionState }
  | { ok: false; reason: string };

export function tryStartSession(
  node: MapNode,
  currentMetrics: HealthMetrics,
  existingSession: SessionState | null,
  nodeStars: Record<number, StarRating>,
  unlockedNodeIds: Set<number>,
): StartSessionResult {
  if (!unlockedNodeIds.has(node.id)) {
    return { ok: false, reason: 'This node is locked.' };
  }

  if ((nodeStars[node.id] ?? 0) >= 3) {
    return { ok: false, reason: 'You already have 3 stars on this node.' };
  }

  if (existingSession) {
    if (existingSession.nodeId !== node.id) {
      return {
        ok: false,
        reason: 'You must complete or quit your current challenge before starting a new one.',
      };
    }
    if (isSessionExpired(existingSession)) {
      return {
        ok: false,
        reason: 'This challenge has expired. Quit it first, then start again.',
      };
    }
    return { ok: false, reason: 'A session is already active at this node.' };
  }

  const session = createSession(node.id, currentMetrics);
  return { ok: true, session };
}

export type CompleteSessionResult =
  | {
      ok: true;
      stars: StarRating;
      rewards: Record<string, number>;
      record: CompletionRecord;
    }
  | { ok: false; reason: string };

export function tryCompleteSession(
  node: MapNode,
  session: SessionState,
  currentMetrics: HealthMetrics,
): CompleteSessionResult {
  if (session.nodeId !== node.id) {
    return { ok: false, reason: 'Session is not for this node.' };
  }

  const progress = getSessionProgress(session, currentMetrics);
  const stars = getNodeStarsEarned(node.completionCriteria, progress);

  if (stars < 1) {
    return { ok: false, reason: 'You haven\'t met the minimum requirements yet.' };
  }

  const rewards = computeNodeRewards(node, stars);
  const record: CompletionRecord = {
    nodeId: node.id,
    stars,
    metrics: progress,
    rewards,
    duration: Date.now() - session.startedAt,
    completedAt: Date.now(),
  };

  return { ok: true, stars, rewards, record };
}
