/**
 * inventoryStockRepository.findAll WHERE 条件测试（T11）
 *
 * P0 bug 验证：T10 修了 controller 透传 status / sourceType，但 SQL 层没真正消费。
 * 本测试用源码审计方式验证 repository.findAll 的 SQL WHERE 条件是否包含 status / sourceType 动态子句。
 *
 * 设计原因：
 * - 项目里没有 initTestDb / seedInventoryStock helper，不能走运行时 DB 测试
 * - T11 修复是纯 SQL 拼接（参数顺序与条件顺序对齐），源码审计能直接证明 bug 修复
 * - controller / service 已有专门测试覆盖，本测试只覆盖 repository 这一层
 *
 * 实现细节（T11 落地时确认）：
 * - findAll 用解构 `const { ..., status, sourceType, ... } = query;` 拿到 2 个新字段
 * - SQL 拼 `if (status) { sql += " AND status = ?"; ... }` 与 `if (sourceType)`
 * - 必须放在 `AND status != 'transferred'` 排除逻辑之后，且 status 在 sourceType 之前（与 params push 顺序对齐）
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const REPO_PATH = path.resolve(__dirname, '../repositories/inventory.repository.ts');

describe('inventoryStockRepository.findAll WHERE 条件 (T11)', () => {
  describe('InventoryStockQuery interface', () => {
    it('含 status? 字段', () => {
      const content = fs.readFileSync(REPO_PATH, 'utf-8');
      // 匹配 `status?: string` 这种可选字段声明
      expect(content).toMatch(/status\?:\s*string/);
    });

    it('含 sourceType? 字段', () => {
      const content = fs.readFileSync(REPO_PATH, 'utf-8');
      expect(content).toMatch(/sourceType\?:\s*string/);
    });
  });

  describe('findAll 函数 WHERE 构建', () => {
    it('含 status 动态子句', () => {
      const content = fs.readFileSync(REPO_PATH, 'utf-8');
      // findAll 内通过解构拿到 status 局部变量，if (status) 后拼 AND status = ?
      // 用解构形式匹配更稳：解构里要包含 status 与 sourceType
      expect(content).toMatch(/const\s*\{[\s\S]*?status[\s\S]*?sourceType[\s\S]*?\}\s*=\s*query/);
      // 拼接的 SQL 子句
      expect(content).toMatch(/AND\s+status\s*=\s*\?/);
    });

    it('含 sourceType 动态子句', () => {
      const content = fs.readFileSync(REPO_PATH, 'utf-8');
      expect(content).toMatch(/AND\s+source_type\s*=\s*\?/);
    });

    it('保留原有 transferred 排除逻辑（最小修改原则）', () => {
      const content = fs.readFileSync(REPO_PATH, 'utf-8');
      // 2026-06-24 已有逻辑：排除已调拨到种源管理的行
      expect(content).toMatch(/AND\s+status\s+!=\s+['"`]transferred['"`]/);
    });

    it('保留 stockType / warehouseId / cropName 三个原有条件', () => {
      const content = fs.readFileSync(REPO_PATH, 'utf-8');
      expect(content).toMatch(/if\s*\(\s*stockType\s*\)/);
      expect(content).toMatch(/if\s*\(\s*warehouseId\s*\)/);
      expect(content).toMatch(/if\s*\(\s*cropName\s*\)/);
    });
  });

  describe('参数顺序与条件顺序', () => {
    it('status if 块位置在 sourceType if 块之前（与 params push 顺序一致）', () => {
      const content = fs.readFileSync(REPO_PATH, 'utf-8');
      // 抓取 findAll 函数体（含开闭大括号）
      const findAllBodyMatch = content.match(/async\s+findAll[\s\S]*?\n\s{2}\}/);
      expect(findAllBodyMatch).toBeTruthy();
      const body = findAllBodyMatch![0];
      // 通过 `if (status)` 与 `if (sourceType)` 的位置比较验证顺序
      // 必须用字面 `if (status)`（避免被 if (...status...) 误匹配）
      const statusIdx = body.search(/if\s*\(\s*status\s*\)/);
      const sourceTypeIdx = body.search(/if\s*\(\s*sourceType\s*\)/);
      expect(statusIdx).toBeGreaterThan(-1);
      expect(sourceTypeIdx).toBeGreaterThan(-1);
      expect(statusIdx).toBeLessThan(sourceTypeIdx);
    });
  });
});
