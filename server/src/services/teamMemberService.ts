/**
 * 班组成员服务
 * 提供班组成员的增删改查操作
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

export interface TeamMember {
  id: string;
  team_id: string;
  worker_id: string;
  role: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberWithName extends TeamMember {
  worker_name: string;
  worker_code: string;
}

/**
 * 获取班组成员列表
 */
export async function getTeamMembers(teamId: string): Promise<TeamMemberWithName[]> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT tm.*, e.name as worker_name, e.employee_code as worker_code
      FROM team_members tm
      JOIN employees e ON tm.worker_id = e.id
      WHERE tm.team_id = ?
      ORDER BY tm.role DESC, tm.joined_at ASC
    `);
    stmt.bind([teamId]);

    const results: TeamMemberWithName[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row as unknown as TeamMemberWithName);
    }
    stmt.free();
    return results;
  } catch (error) {
    return handleServiceError(error, '获取班组成员列表');
  }
}

/**
 * 添加班组成员
 */
export async function addTeamMember(
  teamId: string,
  workerId: string,
  role: string = 'member'
): Promise<TeamMember> {
  try {
    const db = getDatabase();
    const id = generateId('TM');
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO team_members (id, team_id, worker_id, role, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([id, teamId, workerId, role, now, now, now]);
    stmt.free();

    // 更新 teams.member_count
    updateTeamMemberCount(teamId);

    return {
      id,
      team_id: teamId,
      worker_id: workerId,
      role,
      joined_at: now,
      created_at: now,
      updated_at: now,
    };
  } catch (error) {
    return handleServiceError(error, '添加班组成员');
  }
}

/**
 * 移除班组成员
 */
export async function removeTeamMember(teamId: string, workerId: string): Promise<void> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM team_members WHERE team_id = ? AND worker_id = ?
    `);
    stmt.run([teamId, workerId]);
    stmt.free();

    // 更新 teams.member_count
    updateTeamMemberCount(teamId);
  } catch (error) {
    return handleServiceError(error, '移除班组成员');
  }
}

/**
 * 批量添加成员（使用事务优化，避免N+1查询）
 */
export async function addTeamMembers(
  teamId: string,
  workerIds: string[],
  operatorId: string,
  operatorName: string
): Promise<TeamMember[]> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const results: TeamMember[] = [];

    // 使用事务批量插入
    const insertStmt = db.prepare(`
      INSERT INTO team_members (id, team_id, worker_id, role, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // 开启事务
    db.run('BEGIN TRANSACTION');

    try {
      for (const workerId of workerIds) {
        const id = generateId('TM');
        insertStmt.run([id, teamId, workerId, 'member', now, now, now]);
        results.push({
          id,
          team_id: teamId,
          worker_id: workerId,
          role: 'member',
          joined_at: now,
          created_at: now,
          updated_at: now,
        });
      }

      // 批量操作后只更新一次 member_count
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?');
      countStmt.bind([teamId]);
      countStmt.step();
      const countResult = countStmt.getAsObject() as { count: number };
      countStmt.free();

      const updateStmt = db.prepare('UPDATE teams SET member_count = ?, updated_at = ? WHERE id = ?');
      updateStmt.run([countResult.count, now, teamId]);
      updateStmt.free();

      // 提交事务
      db.run('COMMIT');
    } catch (error) {
      // 回滚事务
      db.run('ROLLBACK');
      throw error;
    }

    insertStmt.free();
    return results;
  } catch (error) {
    return handleServiceError(error, '批量添加成员');
  }
}

/**
 * 更新班组 member_count
 */
function updateTeamMemberCount(teamId: string): void {
  const db = getDatabase();

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?');
  countStmt.bind([teamId]);
  countStmt.step();
  const result = countStmt.getAsObject() as { count: number };
  countStmt.free();

  const updateStmt = db.prepare('UPDATE teams SET member_count = ?, updated_at = ? WHERE id = ?');
  updateStmt.run([result.count, new Date().toISOString(), teamId]);
  updateStmt.free();
}

/**
 * 获取班组的技能标签汇总
 */
export async function getTeamSkillTags(teamId: string): Promise<string[]> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT DISTINCT e.skills
      FROM team_members tm
      JOIN employees e ON tm.worker_id = e.id
      WHERE tm.team_id = ? AND e.skills IS NOT NULL AND e.skills != ''
    `);
    stmt.bind([teamId]);

    const allSkills = new Set<string>();
    while (stmt.step()) {
      const row = stmt.getAsObject() as { skills: string };
      try {
        const skills = JSON.parse(row.skills);
        if (Array.isArray(skills)) {
          skills.forEach((skill: string) => allSkills.add(skill));
        }
      } catch {
        // ignore parse error
      }
    }
    stmt.free();
    return Array.from(allSkills);
  } catch (error) {
    return handleServiceError(error, '获取班组技能标签');
  }
}
