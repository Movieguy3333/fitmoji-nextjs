import type { BendDirection, MapNode, MapPath, Point } from './types';

/**
 * Computes a quadratic bezier control point for a path between two nodes.
 * The bend direction and intensity determine how far the curve bows out.
 */
export function calculateBezierControlPoint(
  from: Point,
  to: Point,
  bend: BendDirection,
  intensity: number,
): Point {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return { x: midX, y: midY };

  const perpX = -dy / len;
  const perpY = dx / len;
  const offset = len * 0.2 * intensity;
  const dir = bend === 'left' ? 1 : -1;

  return {
    x: midX + perpX * offset * dir,
    y: midY + perpY * offset * dir,
  };
}

/**
 * Evaluates a point on a quadratic bezier curve at parameter t (0..1).
 */
function quadraticBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * Linear interpolation between two points.
 */
function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Returns a smooth point along a joint-based polyline path using
 * quadratic curves through waypoints. Parameter t goes from 0 to 1.
 */
function sampleJointPath(points: Point[], t: number): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  if (points.length === 2) return lerp(points[0], points[1], t);

  // Build segments using midpoints between joints as on-curve points,
  // with the joints themselves as control points for quadratic curves.
  const segments: { start: Point; control: Point; end: Point }[] = [];
  const first = points[0];
  const last = points[points.length - 1];

  if (points.length === 3) {
    segments.push({ start: first, control: points[1], end: last });
  } else {
    // First segment: from first point, through first joint, to midpoint
    const mid0 = lerp(points[1], points[2], 0.5);
    segments.push({ start: first, control: points[1], end: mid0 });

    // Middle segments
    for (let i = 2; i < points.length - 2; i++) {
      const midStart = lerp(points[i - 1], points[i], 0.5);
      const midEnd = lerp(points[i], points[i + 1], 0.5);
      segments.push({ start: midStart, control: points[i], end: midEnd });
    }

    // Last segment
    const midLast = lerp(points[points.length - 3], points[points.length - 2], 0.5);
    segments.push({
      start: midLast,
      control: points[points.length - 2],
      end: last,
    });
  }

  const totalSegments = segments.length;
  const segT = t * totalSegments;
  const segIndex = Math.min(Math.floor(segT), totalSegments - 1);
  const localT = segT - segIndex;

  const seg = segments[segIndex];
  return quadraticBezier(seg.start, seg.control, seg.end, localT);
}

/**
 * Builds the path interpolation function for a given path definition.
 * Returns a function that takes t (0..1) and returns a Point in map-space.
 */
export function buildPathInterpolator(
  path: MapPath,
  fromNode: MapNode,
  toNode: MapNode,
): (t: number) => Point {
  const from: Point = { x: fromNode.x, y: fromNode.y };
  const to: Point = { x: toNode.x, y: toNode.y };

  if (path.joints && path.joints.length > 0) {
    const allPoints: Point[] = [from, ...path.joints, to];
    return (t: number) => sampleJointPath(allPoints, t);
  }

  const control = calculateBezierControlPoint(from, to, path.bend, path.bendIntensity);
  return (t: number) => quadraticBezier(from, control, to, t);
}

/**
 * Finds the path connecting two nodes (in either direction).
 * Returns the path and a boolean indicating if the path is reversed
 * (i.e., the avatar is moving from `to` to `from`).
 */
export function findPathBetweenNodes(
  paths: MapPath[],
  fromNodeId: number,
  toNodeId: number,
): { path: MapPath; reversed: boolean } | null {
  for (const p of paths) {
    if (p.from === fromNodeId && p.to === toNodeId) {
      return { path: p, reversed: false };
    }
    if (p.from === toNodeId && p.to === fromNodeId) {
      return { path: p, reversed: true };
    }
  }
  return null;
}

/**
 * Returns the IDs of nodes adjacent to a given node via paths.
 */
export function getAdjacentNodeIds(
  paths: MapPath[],
  nodeId: number,
): number[] {
  const adjacent: number[] = [];
  for (const p of paths) {
    if (p.from === nodeId) adjacent.push(p.to);
    if (p.to === nodeId) adjacent.push(p.from);
  }
  return adjacent;
}

/**
 * Finds a traversable node route between two nodes using BFS.
 * When `allowedNodeIds` is provided, only those nodes are traversed.
 */
export function findRouteBetweenNodes(
  paths: MapPath[],
  fromNodeId: number,
  toNodeId: number,
  allowedNodeIds?: Set<number>,
): number[] | null {
  if (fromNodeId === toNodeId) return [fromNodeId];

  const adjacency = new Map<number, number[]>();
  for (const path of paths) {
    const fromNeighbors = adjacency.get(path.from) ?? [];
    fromNeighbors.push(path.to);
    adjacency.set(path.from, fromNeighbors);

    const toNeighbors = adjacency.get(path.to) ?? [];
    toNeighbors.push(path.from);
    adjacency.set(path.to, toNeighbors);
  }

  const queue: number[] = [fromNodeId];
  const visited = new Set<number>([fromNodeId]);
  const previous = new Map<number, number>();

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (typeof nodeId !== 'number') continue;

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;
      if (
        allowedNodeIds &&
        neighborId !== toNodeId &&
        neighborId !== fromNodeId &&
        !allowedNodeIds.has(neighborId)
      ) {
        continue;
      }

      visited.add(neighborId);
      previous.set(neighborId, nodeId);

      if (neighborId === toNodeId) {
        const route = [toNodeId];
        let cursor = toNodeId;
        while (cursor !== fromNodeId) {
          const parent = previous.get(cursor);
          if (typeof parent !== 'number') return null;
          route.push(parent);
          cursor = parent;
        }
        route.reverse();
        return route;
      }

      queue.push(neighborId);
    }
  }

  return null;
}

/**
 * Converts a map-space coordinate to screen-space, accounting for
 * device scale and top margin.
 */
export function mapToScreen(
  point: Point,
  deviceScale: number,
  mapTopMargin: number,
): Point {
  return {
    x: point.x * deviceScale,
    y: point.y * deviceScale + mapTopMargin,
  };
}
