/**
 * inventoryInboundRecord P0 修复测试
 * 2026-07-08：AddStockModal 页面级"新增"入库时无 source 记录，
 *            后端 InboundSchema 要求 sourceId ≥ 1 字符必填导致 Zod 失败。
 *
 * 修复目标：
 * 1. InboundSchema.sourceId 改为 .optional()（页面级入库可空）
 * 2. InboundSchema.sourceModule 枚举加 'manual'（页面级入库模块标识）
 * 3. fetchSourceRow 兼容 'manual' / 空 sourceId（跳过源记录查找）
 * 4. addStockFormAdapter.toPayload 默认 sourceModule = 'manual'（非 'planting'）
 *
 * 策略：源码审计式测试（grep + 正则），不依赖启动 server。
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROUTES_PATH = path.resolve(__dirname, '../routes/inventory.ts');
const ADAPTER_PATH = path.resolve(
  __dirname,
  '../../../src/services/addStockFormAdapter.ts',
);

describe('P0 修复：页面级入库 sourceId 改为可选 + sourceModule 加 manual', () => {
  const routeSrc = fs.readFileSync(ROUTES_PATH, 'utf-8');

  /**
   * 截取 InboundSchema 块：从 "const InboundSchema" 起到 "router.post('/inbound-record'" 之前。
   * 避免误匹配到 fetchSourceRow 函数内的 sourceModule 字符串。
   */
  function extractInboundSchemaBlock(source: string): string {
    const schemaStart = source.indexOf('const InboundSchema');
    if (schemaStart === -1) return '';
    const schemaEnd = source.indexOf("router.post('/inbound-record'", schemaStart);
    if (schemaEnd === -1) return '';
    return source.slice(schemaStart, schemaEnd);
  }

  it('1. InboundSchema.sourceId 改为 z.string().optional()', () => {
    const schemaBlock = extractInboundSchemaBlock(routeSrc);
    expect(schemaBlock.length).toBeGreaterThan(0);
    // 必须不再 .min(1) 强约束，改为 optional
    expect(schemaBlock).toMatch(/sourceId:\s*z\.string\(\)\.optional\(\)/);
    // 反向：确保旧的 min(1) 必填限制已移除
    expect(schemaBlock).not.toMatch(/sourceId:\s*z\.string\(\)\.min\(1/);
  });

  it('2. InboundSchema.sourceModule 枚举加 manual', () => {
    const schemaBlock = extractInboundSchemaBlock(routeSrc);
    expect(schemaBlock.length).toBeGreaterThan(0);
    // 找 sourceModule 枚举
    const match = schemaBlock.match(/sourceModule:\s*z\.enum\(\[([^\]]+)\]\)/);
    expect(match).not.toBeNull();
    const enumValues = match![1];
    expect(enumValues).toMatch(/'manual'/);
    // 同时确认其他 3 个原始枚举值仍存在
    expect(enumValues).toMatch(/'seed_source'/);
    expect(enumValues).toMatch(/'seedling'/);
    expect(enumValues).toMatch(/'planting'/);
  });

  it('3. fetchSourceRow 兼容 manual 模块（无 source 记录时返回空对象）', () => {
    // 抓 fetchSourceRow 函数体
    const funcStart = routeSrc.indexOf('function fetchSourceRow');
    expect(funcStart).toBeGreaterThan(0);
    // 函数体结束：下一个 'function ' 关键字 或 router.post 之前
    const funcEnd = routeSrc.indexOf("router.post('/inbound-record'", funcStart);
    const funcBody = routeSrc.slice(funcStart, funcEnd);
    // 必须有 manual 短路分支 或 sourceId 空的检查
    // 接受任一形式：
    //   - sourceModule === 'manual' || !sourceId
    //   - !sourceId || sourceModule === 'manual'
    expect(funcBody).toMatch(/sourceModule\s*===\s*'manual'\s*\|\|\s*!?sourceId|!?sourceId\s*\|\|\s*sourceModule\s*===\s*'manual'/);
  });

  it('4. addStockFormAdapter.toPayload 默认 sourceModule = manual（不是 planting）', () => {
    // 前端适配器兜底：sourceRecord=null 时 sourceModule 应是 'manual'
    const adapterSrc = fs.readFileSync(ADAPTER_PATH, 'utf-8');
    // 找 toPayload 函数体内的 sourceModule 赋值
    // 期望: sourceModule: sourceRecord?.module ?? 'manual'
    // 禁止: sourceModule: sourceRecord?.module ?? 'planting'
    expect(adapterSrc).toMatch(/sourceModule:\s*sourceRecord\?\.module\s*\?\?\s*'manual'/);
    // 反向：确保没有硬编码 'planting' 兜底
    expect(adapterSrc).not.toMatch(/sourceModule:\s*sourceRecord\?\.module\s*\?\?\s*'planting'/);
  });
});
