/**
 * 班组任务类型能力服务（2026-09-15 Phase 2 - #3 任务类型能力矩阵）
 */
import { getDatabase, saveDatabase } from '../db';
import { generateId } from '../utils/id';
import { handleServiceError } from '../utils/serviceError';

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
    // 2026-09-18 修复 H-1 TOCTOU：原"先 SELECT 后 INSERT"在并发下会触发 UNIQUE 失败。
    // 改用 `INSERT OR IGNORE`（SQLite 原生 upsert 幂等语义）：已存在则跳过，新记录则写入。
    const id = generateId('TCA');
    const now = new Date().toISOString();
    db.run(
      `INSERT OR IGNORE INTO team_task_capabilities (id, team_id, task_type, created_at) VALUES (?, ?, ?, ?)`,
      [id, teamId, taskType, now],
    );
    saveDatabase(); // 2026-09-17 修复：写操作必须持久化
    const finalRes = db.exec(
      'SELECT * FROM team_task_capabilities WHERE team_id = ? AND task_type = ?',
      [teamId, taskType],
    );
    if (finalRes.length > 0 && finalRes[0].values.length > 0) {
      const cols = finalRes[0].columns;
      const row = finalRes[0].values[0];
      const obj: Record<string, unknown> = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj as unknown as TeamTaskCapability;
    }
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
