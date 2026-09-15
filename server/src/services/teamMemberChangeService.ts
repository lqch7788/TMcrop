/**
 * 班组成员变动历史服务（2026-09-15 Phase 2 - #7 人员变动历史）
 */
import { getDatabase } from '../db';
import { generateId } from '../utils/id';

function handleServiceError(error: unknown, operation: string): never {
  console.error(`${operation}失败:`, error);
  if (error instanceof Error) throw new Error(`${operation}失败: ${error.message}`);
  throw new Error(`${operation}失败: 未知错误`);
}

export interface TeamMemberChange {
  id: string;
  team_id: string;
  worker_id: string;
  change_type: string; // add | remove | role_change | become_primary
  old_value: string | null;
  new_value: string | null;
  operator_id: string | null;
  operator_name: string | null;
  reason: string | null;
  created_at: string;
}

export async function recordChange(
  teamId: string,
  workerId: string,
  changeType: string,
  operatorId: string | null,
  operatorName: string | null,
  reason: string | null,
  oldValue: unknown = null,
  newValue: unknown = null,
): Promise<void> {
  try {
    const db = getDatabase();
    const id = generateId('TMC');
    db.run(
      `INSERT INTO team_member_changes (id, team_id, worker_id, change_type, old_value, new_value, operator_id, operator_name, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        teamId,
        workerId,
        changeType,
        oldValue === null ? null : JSON.stringify(oldValue),
        newValue === null ? null : JSON.stringify(newValue),
        operatorId,
        operatorName,
        reason,
        new Date().toISOString(),
      ],
    );
  } catch (error) {
    // Fail Loud：变更日志写入失败不应该阻断主操作，但要让调用方知道
    console.error(`记录班组成员变更历史失败（不影响主流程）:`, error);
  }
}

export async function listTeamChanges(
  teamId: string,
  limit: number = 50,
): Promise<TeamMemberChange[]> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT * FROM team_member_changes WHERE team_id = ? ORDER BY created_at DESC LIMIT ?`,
    );
    stmt.bind([teamId, limit]);
    const rows: TeamMemberChange[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as TeamMemberChange);
    stmt.free();
    return rows;
  } catch (error) {
    return handleServiceError(error, '获取班组成员变更历史');
  }
}
