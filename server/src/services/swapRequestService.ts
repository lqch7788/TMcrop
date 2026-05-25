/**
 * 换班申请服务
 * 提供换班申请相关的数据库操作
 */

import { getDatabase } from '../db';
import { generateId } from '../utils/id';

/**
 * 错误处理包装函数
 * 服务层所有函数使用此函数统一处理错误
 */
function handleServiceError(error: unknown, operation: string): never {
  console.error(`${operation}失败:`, error);
  if (error instanceof Error) {
    throw new Error(`${operation}失败: ${error.message}`);
  }
  throw new Error(`${operation}失败: 未知错误`);
}

/**
 * 换班申请记录
 */
export interface SwapRequest {
  id: string;
  schedule_id: string;
  requester_id: string;
  requester_name: string;
  target_worker_id: string | null;
  target_worker_name: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建换班申请输入参数
 */
export interface CreateSwapRequestInput {
  scheduleId: string;
  requesterId: string;
  requesterName: string;
  targetWorkerId?: string;
  targetWorkerName?: string;
  reason?: string;
}

/**
 * 获取换班申请列表
 * @param filters - 筛选条件
 * @param filters.status - 申请状态筛选
 */
export async function getSwapRequests(filters: { status?: string } = {}): Promise<SwapRequest[]> {
  try {
    const db = getDatabase();

    let sql = `
      SELECT fsr.*, fs.task_id, fs.plan_date, fs.worker_name as original_worker_name
      FROM farm_task_swap_requests fsr
      JOIN farm_task_schedules fs ON fsr.schedule_id = fs.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.status) {
      sql += ' AND fsr.status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY fsr.created_at DESC';

    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results: SwapRequest[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as SwapRequest);
    }
    stmt.free();
    return results;
  } catch (error) {
    return handleServiceError(error, '获取换班申请列表');
  }
}

/**
 * 获取单个换班申请
 * @param id - 换班申请ID
 */
export async function getSwapRequestById(id: string): Promise<SwapRequest | null> {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT fsr.*, fs.task_id, fs.plan_date, fs.worker_name as original_worker_name
      FROM farm_task_swap_requests fsr
      JOIN farm_task_schedules fs ON fsr.schedule_id = fs.id
      WHERE fsr.id = ?
    `);
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as SwapRequest;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  } catch (error) {
    return handleServiceError(error, '获取换班申请详情');
  }
}

/**
 * 创建换班申请
 * @param input - 创建换班申请输入参数
 */
export async function createSwapRequest(input: CreateSwapRequestInput): Promise<SwapRequest> {
  try {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO farm_task_swap_requests (
        id, schedule_id, requester_id, requester_name,
        target_worker_id, target_worker_name, reason, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `);

    stmt.run([
      id,
      input.scheduleId,
      input.requesterId,
      input.requesterName,
      input.targetWorkerId || null,
      input.targetWorkerName || null,
      input.reason || null,
      now,
      now
    ]);

    return getSwapRequestById(id) as Promise<SwapRequest>;
  } catch (error) {
    return handleServiceError(error, '创建换班申请');
  }
}

/**
 * 审批换班申请
 * @param id - 换班申请ID
 * @param approverId - 审批人ID
 */
export async function approveSwapRequest(id: string, approverId: string): Promise<SwapRequest | null> {
  try {
    const existing = await getSwapRequestById(id);
    if (!existing) return null;

    const db = getDatabase();
    const now = new Date().toISOString();

    // 更新换班申请状态
    const updateStmt = db.prepare(`
      UPDATE farm_task_swap_requests SET
        status = 'approved',
        updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run([now, id]);

    // 如果有顶班人，更新排班的执行人
    if (existing.target_worker_id) {
      const scheduleStmt = db.prepare(`
        UPDATE farm_task_schedules SET
          worker_id = ?,
          worker_name = ?,
          updated_at = ?
        WHERE id = ?
      `);
      scheduleStmt.run([existing.target_worker_id, existing.target_worker_name, now, existing.schedule_id]);
    }

    return getSwapRequestById(id);
  } catch (error) {
    return handleServiceError(error, '审批换班申请');
  }
}

/**
 * 拒绝换班申请
 * @param id - 换班申请ID
 */
export async function rejectSwapRequest(id: string): Promise<SwapRequest | null> {
  try {
    const existing = await getSwapRequestById(id);
    if (!existing) return null;

    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE farm_task_swap_requests SET
        status = 'rejected',
        updated_at = ?
      WHERE id = ?
    `);
    stmt.run([now, id]);

    return getSwapRequestById(id);
  } catch (error) {
    return handleServiceError(error, '拒绝换班申请');
  }
}
