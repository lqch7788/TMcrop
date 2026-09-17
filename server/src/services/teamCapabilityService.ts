/**
 * 班组任务类型能力服务（2026-09-15 Phase 2 - #3 任务类型能力矩阵）
 */
import { getDatabase, saveDatabase } from '../db';
import { generateId } from '../utils/id';

function handleServiceError(error: unknown, operation: string): never {
  console.error(`${operation}失败:`, error);
  if (error instanceof Error) throw new Error(`${operation}失败: ${error.message}`);
  throw new Error(`${operation}失败: 未知错误`);
}

export interface TeamTaskCapability {
  id: string;
  team_id: string;
  task_type: string;
  created_at: string;
}

export async function listTeamCapabilities(teamId: string): Promise<TeamTaskCapability[]> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM team_task_capabilities WHERE team_id = ? ORDER BY created_at`);
    stmt.bind([teamId]);
    const rows: TeamTaskCapability[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as TeamTaskCapability);
    stmt.free();
    return rows;
  } catch (error) {
    return handleServiceError(error, '获取班组任务能力');
  }
}

export async function addTeamCapability(teamId: string, taskType: string): Promise<TeamTaskCapability> {
  try {
    const db = getDatabase();
    // 2026-09-17 修复：幂等处理。表有 UNIQUE(team_id, task_type) 约束，
    // 前端 syncTeamCapabilities 用"先删后加"，并发/重复保存时会触发 UNIQUE constraint failed。
    // 已存在时直接返回现有记录。
    const existRes = db.exec(
      'SELECT * FROM team_task_capabilities WHERE team_id = ? AND task_type = ?',
      [teamId, taskType],
    );
    if (existRes.length > 0 && existRes[0].values.length > 0) {
      const cols = existRes[0].columns;
      const row = existRes[0].values[0];
      const obj: Record<string, unknown> = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj as unknown as TeamTaskCapability;
    }

    const id = generateId('TCA');
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO team_task_capabilities (id, team_id, task_type, created_at) VALUES (?, ?, ?, ?)`,
      [id, teamId, taskType, now],
    );
    saveDatabase(); // 2026-09-17 修复：写操作必须持久化，否则重启后任务能力丢失
    return { id, team_id: teamId, task_type: taskType, created_at: now };
  } catch (error) {
    return handleServiceError(error, '添加班组任务能力');
  }
}

export async function removeTeamCapability(teamId: string, taskType: string): Promise<boolean> {
  try {
    const db = getDatabase();
    db.run(
      `DELETE FROM team_task_capabilities WHERE team_id = ? AND task_type = ?`,
      [teamId, taskType],
    );
    saveDatabase(); // 2026-09-17 修复：写操作必须持久化，否则重启后删除的能力"复活"
    return true;
  } catch (error) {
    return handleServiceError(error, '删除班组任务能力');
  }
}
