/**
 * T9 任务测试：后端 /inbound-from-source INSERT 缺字段源码审计
 *
 * 2026-07-08 T9：作物库存入库弹窗重设计 — 后端 service INSERT INTO inventory_inbound_records
 * 必须补全 crop_id / production_plan_id / production_plan_code 3 列。
 *
 * 测试策略：源码 grep 静态检查（不依赖运行时 DB）。
 * 范围：仅检查 INSERT INTO inventory_inbound_records 块（service 中位置行 362-383）。
 *
 * 历史：
 * - 2026-07-08 创建（T9 任务）
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('inventoryInboundFromSourceService INSERT 源码审计', () => {
  const SERVICE_PATH = path.resolve(
    __dirname,
    '../services/inventoryInboundFromSource.service.ts'
  );
  const src = fs.readFileSync(SERVICE_PATH, 'utf-8');

  // 完整捕获：列清单 + VALUES 子句
  // 非贪婪匹配 column list（( ... )）后接 VALUES ( ... )，service 内只有一处
  const fullInsert = src.match(
    /INSERT INTO inventory_inbound_records\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/
  );

  it('service 中存在 INSERT INTO inventory_inbound_records 语句', () => {
    expect(fullInsert, '未找到 INSERT INTO inventory_inbound_records 语句').not.toBeNull();
  });

  it('INSERT INTO inventory_inbound_records 块含 crop_id 列', () => {
    expect(fullInsert).not.toBeNull();
    const colList = fullInsert![1];
    expect(colList).toMatch(/\bcrop_id\b/);
  });

  it('INSERT INTO inventory_inbound_records 块含 production_plan_id 列', () => {
    expect(fullInsert).not.toBeNull();
    const colList = fullInsert![1];
    expect(colList).toMatch(/\bproduction_plan_id\b/);
  });

  it('INSERT INTO inventory_inbound_records 块含 production_plan_code 列', () => {
    expect(fullInsert).not.toBeNull();
    const colList = fullInsert![1];
    expect(colList).toMatch(/\bproduction_plan_code\b/);
  });

  it('INSERT 列名与 VALUES 占位符数量一致（避免占位符错位 bug）', () => {
    expect(fullInsert).not.toBeNull();
    const cols = fullInsert![1]
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const placeholders = fullInsert![2]
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    expect(placeholders.length, 'VALUES 应全部是 ? 占位符').toBeGreaterThan(0);
    expect(cols.length, `列数 ${cols.length} ≠ 占位符数 ${placeholders.length}`).toBe(
      placeholders.length
    );
  });
});
