/**
 * 工人-班组兼职关联服务（2026-09-15 Phase 2 - #10 跨班组成员共享）
 */
import { getDatabase, saveDatabase } from '../db';
import { generateId } from '../utils/id';
import { handleServiceError } from '../utils/serviceError';

export interface WorkerTeamAssignment {
  id: string;
  worker_id: string;
  team_id: string;
  role: string;
  is_primary: number;
  percentage: number;
  joined_at: string;
  left_at: string | null;
  created_at: string;
}

export async function listWorkerTeams(workerId: string): Promise<WorkerTeamAssignment[]> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM worker_team_assignments WHERE worker_id = ? AND left_at IS NULL ORDER BY is_primary DESC, joined_at`);
    stmt.bind([workerId]);
    const rows: WorkerTeamAssignment[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as WorkerTeamAssignment);
    stmt.free();
    return rows;
  } catch (error) {
    return handleServiceError(error, '获取工人所属班组');
  }
}

export async function addWorkerTeam(
  workerId: string,
  teamId: string,
  role: string = 'member',
  percentage: number = 100,
  isPrimary: boolean = false,
): Promise<WorkerTeamAssignment> {
  try {
    const db = getDatabase();
    // 2026-09-18 修复 H-1 TOCTOU：worker_team_assignments 表 UNIQUE(worker_id, team_id, role)，
    // 并发添加会触发 UNIQUE failed。改用 INSERT OR IGNORE 幂等写入。
    const id = generateId('WTA');
    const now = new Date().toISOString();
    db.run(
      `INSERT OR IGNORE INTO worker_team_assignments (id, worker_id, team_id, role, is_primary, percentage, joined_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, workerId, teamId, role, isPrimary ? 1 : 0, percentage, now, now],
    );
    saveDatabase(); // 2026-09-17 修复：写操作必须持久化
    // 查询最终记录（处理并发：可能当前 INSERT 被忽略，已有记录存在）
    const finalRes = db.exec(
      'SELECT * FROM worker_team_assignments WHERE worker_id = ? AND team_id = ? AND role = ?',
      [workerId, teamId, role],
    );
    if (finalRes.length > 0 && finalRes[0].values.length > 0) {
      const row = finalRes[0].values[0];
      const cols = finalRes[0].columns;
      const obj: Record<string, unknown> = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj as unknown as WorkerTeamAssignment;
    }
    return { id, worker_id: workerId, team_id: teamId, role, is_primary: isPrimary ? 1 : 0, percentage, joined_at: now, left_at: null, created_at: now };
  } catch (error) {
    return handleServiceError(error, '添加工人班组兼职');
  }
}

export async function removeWorkerTeam(workerId: string, teamId: string): Promise<boolean> {
  try {
    const db = getDatabase();
    db.run(
      `UPDATE worker_team_assignments SET left_at = ? WHERE worker_id = ? AND team_id = ? AND left_at IS NULL`,
      [new Date().toISOString(), workerId, teamId],
    );
    saveDatabase(); // 2026-09-17 修复：写操作必须持久化，否则重启后解除兼职"复活"
    return true;
  } catch (error) {
    return handleServiceError(error, '解除工人班组兼职');
  }
}
