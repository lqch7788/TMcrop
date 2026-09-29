/**
 * 供应商 ID 回填（2026-09-29 审计修复 P0-4，GREEN 级启动迁移，幂等）
 *
 * 背景：`materials.supplier` 与 `inbound_records.supplier` 是**纯名称字符串**，
 * 两张表的 `supplierId` 列实测 0 行填充（materials 0/85、inbound_records 0/30），
 * 且被引用的 30 个名称中仅 4 个能在 suppliers 主数据命中 —— 供应商改名/删除后
 * 历史引用即脱钩，删除守卫（按名称匹配）也随之失效。
 *
 * 本模块做两件事：
 *   ① 为「被引用但主数据缺失」的供应商补建档案（用户 2026-09-29 授权"自动补建"）
 *   ② 按名称回填两张表的 supplierId
 *
 * 设计取舍：
 *   - **不猜测供应商类型**：物料 category 存在新旧两套格式（"生产投入类" 同时涵盖种子与肥料），
 *     无法可靠推断 SP/FE/PP。统一建为 OT（其他综合类）并在 remarks 标注待人工确认——
 *     错误归类会误触发《农药/种子/肥料》合规硬阻断（PP/SP/FE 三类才需持证）。
 *   - **不补建疑似测试/损坏数据**：名称含 测试/审计/E2E/UI验证 或含替换字符（U+FFFD，mojibake）
 *     的名称一律跳过并列入报告，交由人工处置，避免把测试垃圾固化成主数据（Fail Loud）。
 *   - 幂等：按名称查重；回填只更新 supplierId 为空的行；重复执行零变更。
 */
import { getDatabase } from './index';
import { formatLocalDateISO } from '../utils/dateUtil';

export interface SupplierIdBackfillResult {
  /** 本次新建的供应商（名称） */
  created: string[];
  /** 跳过补建的名称及原因（测试残留 / 编码损坏 / 无意义名称） */
  skipped: Array<{ name: string; reason: string }>;
  /** 回填行数 */
  linked: { materials: number; inboundRecords: number };
  /** 名称命中但仍无 supplierId 的残留行数（应为 0，非 0 表示回填未覆盖） */
  remaining: number;
}

/** 疑似测试/演示残留的名称特征（不补建主数据） */
const TEST_NAME_PATTERN = /测试|审计|E2E|UI验证|tmp|test|demo|验证/i;

/**
 * 判断名称是否不适合自动建档
 * @returns null = 可建档；string = 跳过原因
 */
function skipReason(name: string): string | null {
  const n = String(name || '').trim();
  if (!n) return '空名称';
  // U+FFFD 替换字符 = 编码损坏（mojibake）
  if (n.includes('�')) return '编码损坏（含替换字符）';
  if (TEST_NAME_PATTERN.test(n)) return '疑似测试/演示残留';
  // 纯数字（如 "12"）不是有意义的供应商名
  if (/^\d+$/.test(n)) return '无意义名称（纯数字）';
  return null;
}

/** 生成不与现有编码冲突的自动编码 */
function nextAutoCode(db: any, seq: number): string {
  let n = seq;
  for (;;) {
    const code = `SU_AUTO_${String(n).padStart(4, '0')}`;
    const r = db.exec('SELECT 1 FROM suppliers WHERE supplier_code = ? LIMIT 1', [code]);
    if (r.length === 0 || r[0].values.length === 0) return code;
    n += 1;
  }
}

export function backfillSupplierIds(): SupplierIdBackfillResult {
  const db = getDatabase();
  const result: SupplierIdBackfillResult = {
    created: [],
    skipped: [],
    linked: { materials: 0, inboundRecords: 0 },
    remaining: 0,
  };

  // ── 1. 收集被引用的供应商名称（两张纯名称表） ──
  const names = new Set<string>();
  const collect = (sql: string) => {
    try {
      const r = db.exec(sql);
      if (r.length > 0) for (const row of r[0].values) {
        const v = String(row[0] || '').trim();
        if (v) names.add(v);
      }
    } catch { /* 表缺失则跳过（历史环境） */ }
  };
  collect("SELECT DISTINCT supplier FROM materials WHERE supplier IS NOT NULL AND supplier <> ''");
  collect("SELECT DISTINCT supplier FROM inbound_records WHERE supplier IS NOT NULL AND supplier <> ''");

  // ── 2. 补建缺失的供应商档案 ──
  let seq = 1;
  for (const name of names) {
    const exists = db.exec('SELECT id FROM suppliers WHERE supplier_name = ? LIMIT 1', [name]);
    if (exists.length > 0 && exists[0].values.length > 0) continue; // 已存在 → 幂等跳过

    const reason = skipReason(name);
    if (reason) { result.skipped.push({ name, reason }); continue; }

    const now = new Date().toISOString();
    const code = nextAutoCode(db, seq);
    seq += 1;
    try {
      db.run(
        `INSERT INTO suppliers
          (id, supplier_code, supplier_name, supplier_type, status, remarks,
           create_by, create_date, create_time, update_time)
         VALUES (?, ?, ?, 'OT', 'active', ?, '系统自动补建', ?, ?, ?)`,
        [
          `AUTO_${code}`,
          code,
          name,
          '由「供应商 ID 回填」迁移自动建档：该名称此前被物料/入库单引用但主数据缺失。供应商类型未确认，请人工核实后修正（类型影响农药/种子/肥料资质校验）。',
          formatLocalDateISO(),
          now,
          now,
        ]
      );
      result.created.push(name);
    } catch (e) {
      result.skipped.push({ name, reason: `建档失败：${e instanceof Error ? e.message : String(e)}` });
    }
  }

  // ── 3. 按名称回填 supplierId（只补空值，不覆盖已有） ──
  const link = (table: string, nameCol: string): number => {
    try {
      db.run(
        `UPDATE ${table} SET supplierId = (
           SELECT s.id FROM suppliers s WHERE s.supplier_name = ${table}.${nameCol} LIMIT 1
         )
         WHERE (supplierId IS NULL OR supplierId = '')
           AND ${nameCol} IS NOT NULL AND ${nameCol} <> ''
           AND EXISTS (SELECT 1 FROM suppliers s WHERE s.supplier_name = ${table}.${nameCol})`
      );
      // sql.js 的 db.run 不返回影响行数，须紧邻调用 getRowsModified()
      return typeof db.getRowsModified === 'function' ? db.getRowsModified() : -1;
    } catch { return 0; }
  };
  result.linked.materials = link('materials', 'supplier');
  result.linked.inboundRecords = link('inbound_records', 'supplier');

  // ── 4. 残留统计（Fail Loud：无法关联的行数必须报出来） ──
  try {
    const r = db.exec(`
      SELECT
        (SELECT COUNT(*) FROM materials WHERE (supplierId IS NULL OR supplierId = '') AND supplier IS NOT NULL AND supplier <> '')
        + (SELECT COUNT(*) FROM inbound_records WHERE (supplierId IS NULL OR supplierId = '') AND supplier IS NOT NULL AND supplier <> '')
    `);
    result.remaining = r.length > 0 && r[0].values.length > 0 ? Number(r[0].values[0][0]) || 0 : 0;
  } catch { result.remaining = -1; }

  return result;
}
