import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('E2E 紧急修复：fetchSourceRow 2 个 bug', () => {
  it('fixMissingSchema.ts 必须包含 ALTER TABLE seedlings ADD COLUMN crop_id', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../db/fixMissingSchema.ts'),
      'utf-8'
    );
    expect(src).toMatch(/ALTER TABLE seedlings ADD COLUMN crop_id/);
  });

  it('routes/inventory.ts:134 planting 路由用 deleted_at 而非 is_deleted', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../routes/inventory.ts'),
      'utf-8'
    );
    // 定位 planting 路由块（FROM plantings 之后的 WHERE 条件）
    const plantingBlock = src.match(/FROM plantings[\s\S]*?(?:'|`|;)/);
    expect(plantingBlock).not.toBeNull();
    const blockText = plantingBlock![0];
    expect(blockText).toMatch(/deleted_at IS NULL/);
    expect(blockText).not.toMatch(/is_deleted/);
  });

  it('routes/inventory.ts:132 seedling 路由不引用不存在的列（与 fixMissingSchema 加列对齐）', () => {
    const fixSrc = fs.readFileSync(
      path.resolve(__dirname, '../db/fixMissingSchema.ts'),
      'utf-8'
    );
    const routeSrc = fs.readFileSync(
      path.resolve(__dirname, '../routes/inventory.ts'),
      'utf-8'
    );
    const hasCropIdMigration = /ALTER TABLE seedlings ADD COLUMN crop_id/.test(fixSrc);
    // 抓整条 SQL：含 FROM seedlings 的整行（直到行尾或下一个 sql 赋值）
    const sqlLineMatch = routeSrc.match(/sql\s*=\s*'[^']*FROM seedlings[^']*'/);
    expect(sqlLineMatch).not.toBeNull();
    const sqlLine = sqlLineMatch![0];
    // 如果 fixMissingSchema 加了 crop_id 列，路由 SELECT crop_id 才合法
    if (hasCropIdMigration) {
      expect(sqlLine).toMatch(/crop_id/);
    } else {
      expect(sqlLine).not.toMatch(/crop_id/);
    }
  });
});
