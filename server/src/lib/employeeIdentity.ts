/**
 * 员工身份归一工具（全站唯一入口）
 *
 * 背景：全站曾有 5 套互不相通的员工 ID 空间（employees / users /
 *   farm_operation_records.operator_id / labor_records.worker_id / 姓名哈希），
 *   导致「同一个在不同表里是不同 id」，以及「按姓名哈希编造 ID」
 *   这类反模式（commit 2b382ba0 的说明里自承曾把执行人哈希成 EMP_98404）。
 *
 * 2026-10-24 起（决策 D-A / D-B）：
 *   - `employees` 是唯一的员工档案主数据源，业务表的人员列一律存 `employees.id`
 *   - `users` 是登录账号，通过 `users.employee_id` 挂靠到员工档案（1:N，employee_id 可空）
 *   - 因此 `users.id → employees.id` 有了**确定性通道**，不再需要靠姓名猜测
 *
 * 判定顺序（严格按此顺序，命中即返回）：
 *   1. candidateId 直接命中 employees.id 且 status='active'   → matchedBy='employee_id'
 *   2. candidateId 命中 users.id → users.employee_id → employees.id → matchedBy='user_employee_id'
 *   3. candidateName 唯一命中 employees.name 且 status='active' → matchedBy='name'
 *   4. 否则 → null（调用方不得写库）
 *
 * 第 3 步是兜底而非主路径：多命中或零命中一律返回 null，避免把数据挂到错的人身上。
 *
 * 约束说明：本项目的 SQLite 外键约束**实际生效**（better-sqlite3 默认 ON，
 *   sql.js 由 server/src/db/index.ts:178 显式 ON），但 `ALTER TABLE ADD COLUMN`
 *   不允许带 REFERENCES 子句 —— users.employee_id 无法声明 FK，故走应用层校验 + 索引。
 */
import { getDatabase } from '../db';
import { handleServiceError } from '../utils/serviceError';
import type { Database } from 'sql.js';

/** 归一命中路径 */
export type EmployeeMatchPath = 'employee_id' | 'user_employee_id' | 'name';

/** 归一结果 */
export interface ResolvedEmployee {
  /** 员工档案主键 employees.id */
  employeeId: string;
  /** 员工姓名（employees.name） */
  name: string;
  /** 命中路径，供日志与排障使用 */
  matchedBy: EmployeeMatchPath;
}

/** 单行查询结果 */
interface EmployeeRow {
  id: string;
  name: string;
}

/**
 * 执行单行查询并返回第一行（无结果返回 null）
 *
 * 用 prepare/bind/step/getAsObject 而非 exec，是与仓库既有写法一致
 * （见 farmTaskScheduleService.resolveEmployeeId）。
 */
function queryFirst<T>(db: Database, sql: string, params: string[]): T | null {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    if (stmt.step()) {
      return stmt.getAsObject() as T;
    }
    return null;
  } finally {
    stmt.free();
  }
}

/**
 * 执行查询并返回全部行（上限由 SQL 的 LIMIT 控制）
 */
function queryAll<T>(db: Database, sql: string, params: string[]): T[] {
  const stmt = db.prepare(sql);
  const rows: T[] = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

/**
 * users 表是否已具备 employee_id 列
 *
 * 背景：该列由「员工身份管理 E1 / Task 2」新增（schema.ts + fixMissingSchema.ts）。
 *   在 Task 2 落地前，users 还没有这一列 —— 此时判定分支 2 直接跳过，
 *   退化为「档案直引 → 姓名兜底」，行为与改造前一致。
 *
 * 降级是安全的：分支 2 只是增强路径，缺失时不影响其它两个分支。
 */
function hasUsersEmployeeIdColumn(db: Database): boolean {
  let result: ReturnType<Database['exec']>;
  try {
    result = db.exec('PRAGMA table_info(users)');
  } catch {
    // PRAGMA 本身失败：保守降级为「列不存在」，不阻断其它分支
    return false;
  }
  const table = result?.[0];
  if (!table) return false;
  const nameIdx = table.columns.indexOf('name');
  if (nameIdx < 0) return false;
  return table.values.some((row) => row[nameIdx] === 'employee_id');
}

/**
 * 把任意来源的人员标识归一为 employees.id
 *
 * @param candidateId 候选 ID —— 可以是 `employees.id`，也可以是 `users.id`
 *   （2026-10-24 起农事任务执行人统一为 users.id，见 commit 2b382ba0）
 * @param candidateName 候选姓名 —— 仅作第三级兜底
 * @returns 归一结果；无法确定时返回 null（调用方此时**不得**写库）
 * @throws 数据库访问异常（不静默吞错，遵循 Fail Loud）
 */
export function resolveEmployeeIdentity(
  candidateId: string | null | undefined,
  candidateName?: string | null,
): ResolvedEmployee | null {
  const id = (candidateId ?? '').trim();
  const name = (candidateName ?? '').trim();

  // 空输入直接返回，避免无谓的 DB 往返
  if (!id && !name) return null;

  let db: Database;
  try {
    db = getDatabase();
  } catch (error) {
    return handleServiceError(error, '归一化员工身份');
  }

  try {
    // 分支 1：档案直引
    if (id) {
      const byId = queryFirst<EmployeeRow>(
        db,
        "SELECT id, name FROM employees WHERE id = ? AND status = 'active' LIMIT 1",
        [id],
      );
      if (byId) {
        return { employeeId: byId.id, name: byId.name, matchedBy: 'employee_id' };
      }

      // 分支 2：登录账号 → 员工档案（users.employee_id，E1 Task 2 起可用）
      if (hasUsersEmployeeIdColumn(db)) {
        const byUser = queryFirst<EmployeeRow>(
          db,
          `SELECT e.id AS id, e.name AS name
             FROM users u
             JOIN employees e ON e.id = u.employee_id
            WHERE u.id = ? AND e.status = 'active'
            LIMIT 1`,
          [id],
        );
        if (byUser) {
          return { employeeId: byUser.id, name: byUser.name, matchedBy: 'user_employee_id' };
        }
      }
    }

    // 分支 3：姓名兜底 —— 必须唯一命中，多命中视为无法确定
    if (name) {
      const byName = queryAll<EmployeeRow>(
        db,
        "SELECT id, name FROM employees WHERE name = ? AND status = 'active' LIMIT 2",
        [name],
      );
      if (byName.length === 1) {
        return { employeeId: byName[0].id, name: byName[0].name, matchedBy: 'name' };
      }
    }

    return null;
  } catch (error) {
    return handleServiceError(error, '归一化员工身份');
  }
}

export default resolveEmployeeIdentity;
