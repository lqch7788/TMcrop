/**
 * 班组-作业区域关联服务（2026-09-15 Phase 2 - #1 区域结构化关联）
 */
import { getDatabase, saveDatabase } from '../db';
import { generateId } from '../utils/id';
import { handleServiceError } from '../utils/serviceError';

export interface TeamZoneAssignment {
  id: string;
  team_id: string;
  zone_id: string;
  role: string; // primary | allowed
  created_at: string;
}

export async function listTeamZones(teamId: string): Promise<TeamZoneAssignment[]> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM team_zone_assignments WHERE team_id = ? ORDER BY role, created_at`);
    stmt.bind([teamId]);
    const rows: TeamZoneAssignment[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as TeamZoneAssignment);
    stmt.free();
    return rows;
  } catch (error) {
    return handleServiceError(error, '获取班组区域关联');
  }
}

export async function addTeamZone(teamId: string, zoneId: string, role: string = 'allowed'): Promise<TeamZoneAssignment> {
  try {
    const db = getDatabase();
    // 2026-09-17 修复：幂等处理。表有 UNIQUE(team_id, zone_id, role) 约束，
    // 而前端 syncTeamZones 用"先删后加"实现全量同步，并发/重复保存时两次同步交错
    // 2026-09-18 修复 H-1 TOCTOU：原"先 SELECT 后 INSERT"在并发下会触发 UNIQUE 失败。
    // 改用 `INSERT OR IGNORE`（SQLite 原生 upsert 幂等语义）：已存在则跳过，新记录则写入。
    // 之后用 SELECT 获取最终状态（可能是新插入的，也可能是已存在的）。
    const id = generateId('TZA');
    const now = new Date().toISOString();
    db.run(
      `INSERT OR IGNORE INTO team_zone_assignments (id, team_id, zone_id, role, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, teamId, zoneId, role, now],
    );
    saveDatabase(); // 2026-09-17 修复：写操作必须持久化
    // 查询最终记录（处理并发：可能当前 INSERT 被忽略，已有记录存在）
    const finalRes = db.exec(
      'SELECT * FROM team_zone_assignments WHERE team_id = ? AND zone_id = ? AND role = ?',
      [teamId, zoneId, role],
    );
    if (finalRes.length > 0 && finalRes[0].values.length > 0) {
      const cols = finalRes[0].columns;
      const row = finalRes[0].values[0];
      const obj: Record<string, unknown> = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj as unknown as TeamZoneAssignment;
    }
    // 极小概率：INSERT OR IGNORE 跳过且 SELECT 也为空（说明 INSERT 自己也未命中），
    // 返回新生成的 id 让上层至少能感知调用完成
    return { id, team_id: teamId, zone_id: zoneId, role, created_at: now };
  } catch (error) {
    return handleServiceError(error, '关联班组区域');
  }
}

export async function removeTeamZone(teamId: string, zoneId: string, role: string): Promise<boolean> {
  try {
    const db = getDatabase();
    db.run(
      `DELETE FROM team_zone_assignments WHERE team_id = ? AND zone_id = ? AND role = ?`,
      [teamId, zoneId, role],
    );
    saveDatabase(); // 2026-09-17 修复：写操作必须持久化，否则重启后删除的区域关联"复活"
    return true;
  } catch (error) {
    return handleServiceError(error, '解除班组区域关联');
  }
}
