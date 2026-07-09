/**
 * T13 修复 4 bug 源码审计
 *
 * 背景（2026-07-08）：
 * 4 个 bug 一起改，涉及前后端 6+ 文件。
 * 用户决策：单位以字典为准（12 个），作物形态字段名 crop_form。
 *
 * Bug 清单：
 * 1. 单位 enum 三方对齐（后端 Zod 12 个 + 前端字典加载）
 * 2. 缺作物形态字段（字典 + inventory_inbound_records 表 crop_form 列）
 * 3. 供应商电话多余（external_purchased 移除 supplierPhone）
 * 4. 单位列表重做（与 bug 1 同源）
 *
 * 测试策略：源码审计（grep + 正则），不依赖启动 server / mock db，验证快速可靠。
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROUTES_INVENTORY_PATH = path.resolve(__dirname, '../routes/inventory.ts');
const FIX_SCHEMA_PATH = path.resolve(__dirname, '../db/fixMissingSchema.ts');
const ADD_STOCK_CONSTANTS_PATH = path.resolve(
  __dirname,
  '../../../src/components/farm/inventory/AddStockModal.constants.ts',
);
const ADD_STOCK_MODAL_PATH = path.resolve(
  __dirname,
  '../../../src/components/farm/inventory/AddStockModal.tsx',
);
const ADD_STOCK_FORM_ADAPTER_PATH = path.resolve(
  __dirname,
  '../../../src/services/addStockFormAdapter.ts',
);

describe('T13 修复 4 bug 源码审计', () => {
  const routesSrc = fs.readFileSync(ROUTES_INVENTORY_PATH, 'utf-8');
  const schemaSrc = fs.readFileSync(FIX_SCHEMA_PATH, 'utf-8');
  const constantsSrc = fs.readFileSync(ADD_STOCK_CONSTANTS_PATH, 'utf-8');
  const modalSrc = fs.readFileSync(ADD_STOCK_MODAL_PATH, 'utf-8');
  const adapterSrc = fs.readFileSync(ADD_STOCK_FORM_ADAPTER_PATH, 'utf-8');

  // ============================================================
  // Bug 1：单位 enum 三方对齐（后端 12 个 + 前端字典加载）
  // ============================================================
  describe('Bug 1：单位 enum 三方对齐', () => {
    it('routes/inventory.ts 存在 UNIT_ENUM 含 12 个单位值', () => {
      // 匹配 UNIT_ENUM = z.enum([...]) 引用形式（不再用内联）
      const match = routesSrc.match(
        /UNIT_ENUM\s*=\s*z\.enum\(\[([^\]]+)\]\)/,
      );
      expect(match, 'UNIT_ENUM = z.enum([...]) 不存在').not.toBeNull();
      const values = match![1];
      // 12 个字符值（袋/株/粒/千克/克/吨/亩/m²/公顷/块/片/朵）必须全部出现
      expect(values, "缺少 '袋'").toMatch(/'袋'/);
      expect(values, "缺少 '株'").toMatch(/'株'/);
      expect(values, "缺少 '粒'").toMatch(/'粒'/);
      expect(values, "缺少 '千克'").toMatch(/'千克'/);
      expect(values, "缺少 '克'").toMatch(/'克'/);
      expect(values, "缺少 '吨'").toMatch(/'吨'/);
      expect(values, "缺少 '亩'").toMatch(/'亩'/);
      expect(values, "缺少 'm²'").toMatch(/'m²'/);
      expect(values, "缺少 '公顷'").toMatch(/'公顷'/);
      expect(values, "缺少 '块'").toMatch(/'块'/);
      expect(values, "缺少 '片'").toMatch(/'片'/);
      expect(values, "缺少 '朵'").toMatch(/'朵'/);
    });
  });

  // ============================================================
  // Bug 2：缺作物形态字段（字典 + 表 crop_form 列 + Zod + INSERT + 6 套 FIELD_CONFIG）
  // ============================================================
  describe('Bug 2：作物形态 crop_form 全链路接入', () => {
    it('routes/inventory.ts InboundSchema 含 cropForm 可选字段', () => {
      expect(routesSrc, 'InboundSchema 缺 cropForm: z.string().optional()').toMatch(
        /cropForm:\s*z\.string\(\)\.optional\(\)/,
      );
    });

    it('routes/inventory.ts INSERT inventory_inbound_records 包含 crop_form 列', () => {
      // 直接在文件中找 crop_form 字符串（不限位置）
      expect(routesSrc, 'routes/inventory.ts 缺 crop_form 字符串').toMatch(/crop_form/);
      // 找到 INSERT 块（从 INSERT INTO inventory_inbound_records 到 db.run 结束）
      const insertStart = routesSrc.indexOf('INSERT INTO inventory_inbound_records');
      expect(insertStart, 'INSERT INTO inventory_inbound_records 不存在').toBeGreaterThan(0);
      // 直接扩展截取到 INSERT 块结束（db.run(`
      // 后面跟着 VALUES (...) 和 ],）
      const insertEnd = routesSrc.indexOf('])', insertStart);
      expect(insertEnd, 'INSERT 块 ]) 结束符不存在').toBeGreaterThan(insertStart);
      const insertBlock = routesSrc.slice(insertStart, insertEnd + 2);
      // 列必须有 crop_form
      expect(insertBlock, 'INSERT 列缺 crop_form').toMatch(/crop_form/);
      // VALUES 占位符链路：input.cropForm || null 传入
      expect(insertBlock, 'INSERT 参数未引用 input.cropForm').toMatch(/input\.cropForm/);
    });

    it('fixMissingSchema.ts 补 inventory_inbound_records.crop_form 列', () => {
      // ALTER TABLE ADD COLUMN crop_form TEXT (try/catch 包裹防重复列错误)
      const re = /try\s*\{\s*db\.run\(['"]?ALTER TABLE inventory_inbound_records\s+ADD COLUMN\s+crop_form\s+TEXT['"]?\)/i;
      expect(schemaSrc, 'fixMissingSchema.ts 缺 ALTER TABLE crop_form 列').toMatch(re);
    });

    it('fixMissingSchema.ts 创建"作物形态"字典类别 + 6 项', () => {
      // 创建字典类别：category_code = crop_form
      expect(schemaSrc, '缺 dictionary_categories INSERT crop_form').toMatch(
        /INSERT INTO dictionary_categories[\s\S]*?crop_form/i,
      );
      // 6 个项目（whole_plant/fruit/seed/leaf/flower/other）
      const items = ['整株', '果实', '种子', '叶片', '花朵', '其他'];
      for (const label of items) {
        const re = new RegExp(`(['"])${label}\\1`, 'g');
        expect(re.test(schemaSrc), `字典缺作物形态项：${label}`).toBe(true);
      }
    });

    it('AddStockModal.constants.ts 6 套 FIELD_CONFIG 都含 cropForm 字段', () => {
      const fields = [
        'external_purchased', 'gift', 'commissioned',
        'transfer', 'manual', 'self_produced',
      ];
      for (const src of fields) {
        // 匹配 FIELD_CONFIG[src]: [ ... ] 块
        const re = new RegExp(`${src}:\\s*\\[[^\\]]+\\]`, 's');
        const block = constantsSrc.match(re);
        expect(block, `FIELD_CONFIG.${src} 不存在`).not.toBeNull();
        expect(block![0], `FIELD_CONFIG.${src} 应含 cropForm`).toMatch(/cropForm/);
      }
    });
  });

  // ============================================================
  // Bug 3：供应商电话多余（external_purchased 移除 supplierPhone）
  // ============================================================
  describe('Bug 3：移除 external_purchased 供应商电话', () => {
    it('AddStockModal.constants.ts external_purchased 不再含 supplierPhone', () => {
      // 排除注释干扰：只匹配字段对象 { key: 'supplierPhone', ... }
      // 用 dotAll 标志 + 匹配块 + 排除注释
      const blockMatch = constantsSrc.match(
        /external_purchased:\s*\[([\s\S]*?)\n\s*\],/,
      );
      expect(blockMatch, 'external_purchased 块不存在').not.toBeNull();
      const blockContent = blockMatch![1];
      // 移除单行注释（// ...）后再匹配
      const codeOnly = blockContent
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
      expect(
        codeOnly,
        'external_purchased 字段中不应含 supplierPhone',
      ).not.toMatch(/supplierPhone/);
    });

    it('AddStockModal.constants.ts fieldsToResetOnSourceTypeChange 不再含 supplierPhone', () => {
      // 匹配 export function fieldsToResetOnSourceTypeChange() 完整函数
      const blockMatch = constantsSrc.match(
        /export\s+function\s+fieldsToResetOnSourceTypeChange[\s\S]*?\n\}/,
      );
      expect(blockMatch, 'fieldsToResetOnSourceTypeChange 函数不存在').not.toBeNull();
      expect(
        blockMatch![0],
        'fieldsToResetOnSourceTypeChange 不应含 supplierPhone',
      ).not.toMatch(/supplierPhone/);
    });
  });

  // ============================================================
  // Bug 4：单位列表从字典加载（不再硬编码 9 个）
  // ============================================================
  describe('Bug 4：单位列表用字典加载', () => {
    it('AddStockModal.tsx 移除硬编码 UNIT_OPTIONS 数组', () => {
      // 单元硬编码数组不允许再出现
      expect(modalSrc, 'AddStockModal.tsx 仍含 const UNIT_OPTIONS').not.toMatch(
        /const UNIT_OPTIONS:/,
      );
    });

    it('AddStockModal.tsx 使用 getDictItems 加载单位（unit 字典）', () => {
      expect(modalSrc, 'getDictItems(\'unit\') 未被调用').toMatch(/getDictItems\(['"]unit['"]\)/);
    });

    it('AddStockModal.tsx 使用 getDictItems 加载作物形态（crop_form 字典）', () => {
      expect(modalSrc, 'getDictItems(\'crop_form\') 未被调用').toMatch(
        /getDictItems\(['"]crop_form['"]\)/,
      );
    });

    it('AddStockModal.constants.ts 新增 select-dict-crop-form 字段类型', () => {
      expect(
        constantsSrc,
        'FIELD_TYPE 缺少 select-dict-crop-form',
      ).toMatch(/'select-dict-crop-form'/);
    });
  });

  // ============================================================
  // 跨链路一致性：addStockFormAdapter 透传 cropForm
  // ============================================================
  describe('适配器一致性：addStockFormAdapter 透传 cropForm', () => {
    it('adapter.toPayload 返回 cropForm 字段', () => {
      expect(adapterSrc, 'toPayload 缺 cropForm 字段').toMatch(/cropForm/);
    });
  });
});
