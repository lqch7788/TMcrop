/**
 * AI-08 路径优化算法服务（V1 — 纯 JS VRP）
 * 2026-08-22：P1 重要 MVP
 *
 * 算法：最近邻（Nearest Neighbor）+ 2-opt 改进
 * - 输入：工人起点 + N 个任务位置（lat/lng）
 * - 输出：最优执行顺序 + 总距离 + 相比原顺序节省 %
 * - 验证目标：相比原始顺序节省移动距离 ≥15%
 */

interface Task {
  task_id: string;
  lat: number;
  lng: number;
  name?: string;
}

interface RouteOptimizeInput {
  worker_start: { lat: number; lng: number };
  tasks: Task[];                  // 待执行任务列表
  original_order?: string[];      // 原顺序（用于对比节省 %），默认按 tasks 数组顺序
}

interface RouteStep {
  task_id: string;
  name?: string;
  distance_from_prev_km: number;
  cumulative_distance_km: number;
}

interface RouteOptimizeResult {
  optimized_order: string[];
  optimized_steps: RouteStep[];
  total_distance_km: number;
  original_distance_km: number;
  savings_percent: number;
  algorithm: 'nearest-neighbor + 2-opt';
  model_version: string;
}

const MODEL_VERSION = '1.0.0-vrp';
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine 距离（公里）
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * 构建距离矩阵
 */
function buildDistanceMatrix(start: { lat: number; lng: number }, tasks: Task[]): number[][] {
  // 0 = 起点，1..N = 任务
  const points = [start, ...tasks.map(t => ({ lat: t.lat, lng: t.lng }))];
  const n = points.length;
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      matrix[i][j] = i === j ? 0 : haversineDistance(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
    }
  }
  return matrix;
}

/**
 * 计算路径总距离
 */
function totalDistance(order: number[], matrix: number[][]): number {
  let dist = 0;
  for (let i = 0; i < order.length - 1; i++) {
    dist += matrix[order[i]][order[i + 1]];
  }
  return dist;
}

/**
 * 最近邻算法（起点 = index 0）
 */
function nearestNeighbor(matrix: number[][]): number[] {
  const n = matrix.length;
  const visited = new Set<number>([0]);
  const order = [0];
  let current = 0;
  while (visited.size < n) {
    let nearest = -1;
    let nearestDist = Infinity;
    for (let j = 1; j < n; j++) {
      if (!visited.has(j) && matrix[current][j] < nearestDist) {
        nearest = j;
        nearestDist = matrix[current][j];
      }
    }
    if (nearest === -1) break;
    order.push(nearest);
    visited.add(nearest);
    current = nearest;
  }
  return order;
}

/**
 * 2-opt 改进
 */
function twoOpt(order: number[], matrix: number[][], maxIterations: number = 50): number[] {
  let best = [...order];
  let bestDist = totalDistance(best, matrix);
  let improved = true;
  let iter = 0;

  while (improved && iter < maxIterations) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let j = i + 1; j < best.length - 1; j++) {
        const newOrder = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const newDist = totalDistance(newOrder, matrix);
        if (newDist < bestDist - 1e-6) {
          best = newOrder;
          bestDist = newDist;
          improved = true;
        }
      }
    }
    iter++;
  }
  return best;
}

/**
 * 主函数：路径优化
 */
export async function optimizeRoute(input: RouteOptimizeInput): Promise<RouteOptimizeResult> {
  if (!input.worker_start || !input.tasks || input.tasks.length === 0) {
    throw new Error('worker_start 和 tasks 必填');
  }

  const matrix = buildDistanceMatrix(input.worker_start, input.tasks);

  // 1. 计算原顺序的总距离
  const originalOrder = (input.original_order && input.original_order.length === input.tasks.length)
    ? [0, ...input.original_order.map(id => input.tasks.findIndex(t => t.task_id === id) + 1).filter(i => i > 0)]
    : [0, ...Array.from({ length: input.tasks.length }, (_, i) => i + 1)];
  const originalDist = totalDistance(originalOrder, matrix);

  // 2. 最近邻 + 2-opt
  const nnOrder = nearestNeighbor(matrix);
  const optimizedOrder = twoOpt(nnOrder, matrix);
  const optimizedDist = totalDistance(optimizedOrder, matrix);

  // 3. 构建步骤
  const steps: RouteStep[] = [];
  let cumulative = 0;
  for (let i = 0; i < optimizedOrder.length; i++) {
    const idx = optimizedOrder[i];
    if (idx === 0) continue;  // 跳过起点
    const prevIdx = i > 0 ? optimizedOrder[i - 1] : 0;
    const dist = matrix[prevIdx][idx];
    cumulative += dist;
    steps.push({
      task_id: input.tasks[idx - 1].task_id,
      name: input.tasks[idx - 1].name,
      distance_from_prev_km: Math.round(dist * 100) / 100,
      cumulative_distance_km: Math.round(cumulative * 100) / 100,
    });
  }

  const savingsPercent = originalDist > 0 ? Math.round((1 - optimizedDist / originalDist) * 1000) / 10 : 0;

  return {
    optimized_order: steps.map(s => s.task_id),
    optimized_steps: steps,
    total_distance_km: Math.round(optimizedDist * 100) / 100,
    original_distance_km: Math.round(originalDist * 100) / 100,
    savings_percent: savingsPercent,
    algorithm: 'nearest-neighbor + 2-opt',
    model_version: MODEL_VERSION,
  };
}
