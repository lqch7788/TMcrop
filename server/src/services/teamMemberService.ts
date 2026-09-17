/**
 * 班组成员服务
 * 提供班组成员的增删改查操作
 */

import { getDatabase, saveDatabase } from '../db';
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
      WHERE tm.team_id = ? AND tm.left_at IS NULL
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
    saveDatabase(); // 2026-09-17 修复：事务提交后持久化，否则重启后批量分配丢失
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
  saveDatabase(); // 2026-09-17 修复：写操作必须持久化（sql.js 内存库），否则重启后成员变动丢失
}

/**
 * 2026-09-15：增强版 addTeamMember — 同步写主职兼职关联 + 变更日志
 */
export async function addTeamMemberWithLog(
  teamId: string,
  workerId: string,
  role: string = 'member',
  ctx: { isPrimary?: boolean; percentage?: number; operatorId?: string; operatorName?: string; reason?: string } = {},
): Promise<TeamMember> {
  try {
    const db = getDatabase();
    const id = generateId('TM');
    const now = new Date().toISOString();
    const { isPrimary = true, percentage = 100, operatorId, operatorName, reason } = ctx;

    // 1. 写主表 team_members（2026-09-17 修复：软删除记录仍在表中，唯一约束下需先查后写，否则重新添加报 UNIQUE 错误）
    const existRes = db.exec(
      'SELECT id FROM team_members WHERE team_id = ? AND worker_id = ?',
      [teamId, workerId],
    );
    const existMemberId = existRes[0]?.values?.[0]?.[0] as string | undefined;
    if (existMemberId) {
      db.run(
        `UPDATE team_members SET left_at = NULL, left_reason = NULL, role = ?, joined_at = ?, updated_at = ? WHERE id = ?`,
        [role, now, now, existMemberId],
      );
    } else {
      db.run(
        `INSERT INTO team_members (id, team_id, worker_id, role, joined_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, teamId, workerId, role, now, now, now],
      );
    }

    // 2. 写主职/兼职关联 worker_team_assignments（同样 UNIQUE(worker_id, team_id, role)）
    const wtaExistRes = db.exec(
      'SELECT id FROM worker_team_assignments WHERE worker_id = ? AND team_id = ? AND role = ?',
      [workerId, teamId, role],
    );
    const wtaExistId = wtaExistRes[0]?.values?.[0]?.[0] as string | undefined;
    if (wtaExistId) {
      db.run('UPDATE worker_team_assignments SET left_at = NULL WHERE id = ?', [wtaExistId]);
    } else {
      const wtaId = generateId('WTA');
      db.run(
        `INSERT INTO worker_team_assignments (id, worker_id, team_id, role, is_primary, percentage, joined_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [wtaId, workerId, teamId, role, isPrimary ? 1 : 0, percentage, now, now],
      );
    }

    // 3. 写变更日志
    await recordMemberChange(teamId, workerId, 'add', null, { role, isPrimary, percentage }, operatorId, operatorName, reason);

    // 4. 更新 member_count
    updateTeamMemberCount(teamId);

    return { id, team_id: teamId, worker_id: workerId, role, joined_at: now, created_at: now, updated_at: now };
  } catch (error) {
    return handleServiceError(error, '添加班组成员（含日志）');
  }
}

/**
 * 2026-09-15：增强版 addTeamMembers（批量，使用事务）
 */
export async function addTeamMembersWithLog(
  teamId: string,
  workerIds: string[],
  role: string = 'member',
  ctx: { operatorId?: string; operatorName?: string } = {},
): Promise<TeamMember[]> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const results: TeamMember[] = [];
    const { operatorId, operatorName } = ctx;

    db.run('BEGIN TRANSACTION');
    try {
      for (const workerId of workerIds) {
        // 2026-09-17 修复：team_members 有 (team_id, worker_id) 唯一约束，软删除（left_at）的记录
        // 仍留在表中，直接 INSERT 会报 UNIQUE constraint failed，导致"移除成员后重新加回"永久失败。
        // 存在旧记录时改为复活更新（清空 left_at）。
        const existRes = db.exec(
          'SELECT id FROM team_members WHERE team_id = ? AND worker_id = ?',
          [teamId, workerId],
        );
        const existId = existRes[0]?.values?.[0]?.[0] as string | undefined;

        let memberId: string;
        if (existId) {
          db.run(
            `UPDATE team_members SET left_at = NULL, left_reason = NULL, role = ?, joined_at = ?, updated_at = ? WHERE id = ?`,
            [role, now, now, existId],
          );
          memberId = existId;
        } else {
          memberId = generateId('TM');
          db.run(
            `INSERT INTO team_members (id, team_id, worker_id, role, joined_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [memberId, teamId, workerId, role, now, now, now],
          );
        }

        // 同步写 worker_team_assignments（该表 UNIQUE(worker_id, team_id, role)，同样需先查后写）
        const wtaRes = db.exec(
          'SELECT id FROM worker_team_assignments WHERE worker_id = ? AND team_id = ? AND role = ?',
          [workerId, teamId, role],
        );
        const wtaExistId = wtaRes[0]?.values?.[0]?.[0] as string | undefined;
        if (wtaExistId) {
          db.run('UPDATE worker_team_assignments SET left_at = NULL WHERE id = ?', [wtaExistId]);
        } else {
          db.run(
            `INSERT INTO worker_team_assignments (id, worker_id, team_id, role, is_primary, percentage, joined_at, created_at)
             VALUES (?, ?, ?, ?, 1, 100, ?, ?)`,
            [generateId('WTA'), workerId, teamId, role, now, now],
          );
        }

        await recordMemberChange(teamId, workerId, 'add', null, { role }, operatorId, operatorName);
        results.push({ id: memberId, team_id: teamId, worker_id: workerId, role, joined_at: now, created_at: now, updated_at: now });
      }

      // 更新 member_count
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?');
      countStmt.bind([teamId]);
      countStmt.step();
      const count = (countStmt.getAsObject() as { count: number }).count;
      countStmt.free();

      db.run('UPDATE teams SET member_count = ?, updated_at = ? WHERE id = ?', [count, now, teamId]);
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
    saveDatabase(); // 2026-09-17 修复：事务提交后持久化，否则重启后批量分配丢失
    return results;
  } catch (error) {
    return handleServiceError(error, '批量添加班组成员（含日志）');
  }
}

/**
 * 2026-09-15：增强版 removeTeamMember — 软删除 + 关闭兼职 + 写日志
 */
export async function removeTeamMemberWithLog(
  teamId: string,
  workerId: string,
  ctx: { operatorId?: string; operatorName?: string; reason?: string } = {},
): Promise<void> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const { operatorId, operatorName, reason } = ctx;

    // 1. 软删除 team_members（保留历史，置 left_at）
    db.run(
      `UPDATE team_members SET left_at = ?, left_reason = ?, updated_at = ? WHERE team_id = ? AND worker_id = ?`,
      [now, reason || null, now, teamId, workerId],
    );

    // 2. 关闭 worker_team_assignments 兼职关联
    db.run(
      `UPDATE worker_team_assignments SET left_at = ? WHERE worker_id = ? AND team_id = ? AND left_at IS NULL`,
      [now, workerId, teamId],
    );

    // 3. 写变更日志
    await recordMemberChange(teamId, workerId, 'remove', { reason: '主动移除' }, null, operatorId, operatorName, reason);

    // 4. 更新 member_count（统计在职）
    updateTeamMemberCountActive(teamId);
  } catch (error) {
    return handleServiceError(error, '移除班组成员（含日志）');
  }
}

/**
 * 2026-09-15：辅助 - 写变更日志（直接调用 teamMemberChangeService.recordChange）
 */
async function recordMemberChange(
  teamId: string,
  workerId: string,
  changeType: string,
  oldValue: unknown,
  newValue: unknown,
  operatorId?: string,
  operatorName?: string,
  reason?: string,
): Promise<void> {
  try {
    const { recordChange } = await import('./teamMemberChangeService');
    await recordChange(teamId, workerId, changeType, operatorId || null, operatorName || null, reason || null, oldValue, newValue);
  } catch {
    // recordChange 内部已 handleServiceError 但不应阻断主流程
  }
}

/**
 * 2026-09-15：辅助 - 更新 teams.member_count（仅统计 left_at IS NULL 的在职成员）
 */
function updateTeamMemberCountActive(teamId: string): void {
  const db = getDatabase();
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ? AND left_at IS NULL');
  countStmt.bind([teamId]);
  countStmt.step();
  const result = countStmt.getAsObject() as { count: number };
  countStmt.free();
  db.run('UPDATE teams SET member_count = ?, updated_at = ? WHERE id = ?', [result.count, new Date().toISOString(), teamId]);
  saveDatabase(); // 2026-09-17 修复：写操作必须持久化，否则重启后移除成员的操作丢失
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
