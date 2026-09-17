/**
 * 班组-作业区域关联服务（2026-09-15 Phase 2 - #1 区域结构化关联）
 */
import { getDatabase, saveDatabase } from '../db';
import { generateId } from '../utils/id';

function handleServiceError(error: unknown, operation: string): never {
  console.error(`${operation}失败:`, error);
  if (error instanceof Error) throw new Error(`${operation}失败: ${error.message}`);
  throw new Error(`${operation}失败: 未知错误`);
}

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
    const id = generateId('TZA');
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO team_zone_assignments (id, team_id, zone_id, role, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, teamId, zoneId, role, now],
    );
    saveDatabase(); // 2026-09-17 修复：写操作必须持久化，否则重启后区域关联丢失
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
