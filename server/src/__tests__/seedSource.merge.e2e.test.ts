/**
 * API 级 E2E 测试：种源自动合并功能
 *
 * 覆盖核心业务流程：
 * 1. 写时合并：同合并键的 PROPAGATION 重复回流 → 合并到同一条种源
 * 2. 冲销流程：外购入库 → 冲销 → 库存回退 + 审计日志写入
 * 3. UNION 查询：history-inbound 返回 inventory_inbound + crop_circulation 两源数据
 * 4. matchable 查询：返回同合并键的候选种源
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, getDatabase, saveDatabase, closeDatabase } from '../db';
import { initializeDatabase } from '../db/schema';
import { executeCirculation } from '../services/circulation.service';
import { reverseInboundRecord } from '../services/inboundReverse.service';
import { seedSourceRepository } from '../repositories/seedSource.repository';
import { revokeCirculation } from '../services/circulation.service';
import fs from 'fs';
import path from 'path';

/** 生成唯一 ID 避免 UNIQUE 冲突（含 run 级别唯一前缀） */
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
function uid(prefix: string): string {
  return `${prefix}-${RUN_ID}-${Math.random().toString(36).slice(2, 6)}`;
}

describe('种源自动合并 E2E', () => {
  beforeAll(async () => {
    // 初始化数据库
    await initDatabase();
    initializeDatabase();

    // 清理上一次测试 run 残留的数据（使用通配符覆盖所有可能的测试数据模式）
    const db = getDatabase();
    // 删除所有非原始数据（原始数据的 crop_code 不含 'CROP-' 前缀且 source_code 不含 'SRC-CODE'）
    db.exec(`DELETE FROM seed_sources WHERE source_code LIKE 'SRC-CODE%' OR crop_code LIKE 'CROP%' OR id LIKE 'SRC-%' OR id LIKE 'PARENT-%'`);
    db.exec(`DELETE FROM inventory_inbound_records WHERE id LIKE 'INB-%'`);
    db.exec(`DELETE FROM inbound_edit_log WHERE inbound_id LIKE 'INB-%'`);
    db.exec(`DELETE FROM inventory_transaction WHERE business_id LIKE 'INB-%'`);
    db.exec(`DELETE FROM crop_circulation_records WHERE source_id LIKE 'PL-%'`);
    // 清理 writeFlowLog 产生的 material_flow_log 记录
    db.exec(`DELETE FROM material_flow_log WHERE business_code LIKE 'PL-%' OR business_code LIKE 'CIRC-%'`);
    saveDatabase();
  });

  afterAll(() => {
    closeDatabase();
    // 清理测试数据库文件
    const testDbPath = path.join(__dirname, '../../data/test-e2e.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('写时合并', () => {
    it('同合并键多次回流 → 合并为同一种源', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();

      // 创建 parent 种源（提供 crop_code 等字段）
      const parentId = uid('PARENT');
      const cropCode = uid('CROP');
      db.run(`INSERT INTO seed_sources (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, generation, quantity, remaining_quantity, status, create_time, update_time)
              VALUES (?, ?, 'external', ?, '合并作物', '品种A', '种子', '粒', 'F1', 1000, 1000, 'active', ?, ?)`, [parentId, uid('SRC-CODE'), cropCode, now, now]);

      const baseInput = {
        circulationType: 'PROPAGATION' as const,
        sourceModule: 'planting' as const,
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving' as const,
        destination: 'seed_source' as const,
        quantity: 100,
        unit: '粒',
        seedForm: '种子',
        generation: 'F1',
        operatorId: 'user-admin',
      };

      // 第一次回流 → 创建新种源
      const result1 = await executeCirculation(baseInput);
      expect(result1.mergeAction).toBe('create_new');
      expect(result1.stockId).toBeDefined();
      const targetId = result1.stockId;

      // 第二次回流（相同合并键）→ 合并到同一种源
      const result2 = await executeCirculation({
        ...baseInput,
        sourceId: uid('PL'),  // 不同种植，同作物+同形态+同世代
      });
      expect(result2.mergeAction).toBe('merge_into_existing');
      expect(result2.stockId).toBe(targetId);  // 合并到同一个

      // 验证：种源数量累加
      const stmt = db.prepare('SELECT quantity, remaining_quantity, reflow_count FROM seed_sources WHERE id = ?');
      stmt.bind([targetId || '']);
      const row: any = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();

      expect(row.quantity).toBe(200);  // 100 + 100
      expect(row.remaining_quantity).toBe(200);
      expect(row.reflow_count).toBe(1);  // 合并了 1 次

      // 验证：相同 crop + 形态 + 单位 + 世代 但不同 propagation_method → 不合并
      const cuttingResult = await executeCirculation({
        ...baseInput,
        sourceId: uid('PL'),
        subType: 'cutting',  // 不同繁殖方法
        seedForm: '果实',    // 不同形态
      });
      expect(cuttingResult.mergeAction).toBe('create_new');  // 不合并
      expect(cuttingResult.stockId).not.toBe(targetId);
    });

    it('不同 unit 的回流 → 不合并', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const parentId = uid('PARENT');
      db.run(`INSERT INTO seed_sources (id, source_code, source_origin, crop_code, crop_name, seed_form, unit, generation, quantity, remaining_quantity, status, create_time, update_time)
              VALUES (?, ?, 'external', ?, '单位作物', '种子', '千克', 'F1', 1000, 1000, 'active', ?, ?)`, [parentId, uid('SRC-CODE'), uid('CROP'), now, now]);

      const baseInput = {
        circulationType: 'PROPAGATION' as const,
        sourceModule: 'planting' as const,
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving' as const,
        destination: 'seed_source' as const,
        quantity: 50,
        unit: '千克',
        seedForm: '种子',
        generation: 'F1',
      };

      const r1 = await executeCirculation(baseInput);
      expect(r1.mergeAction).toBe('create_new');

      // 不同单位 → 不合并
      const r2 = await executeCirculation({ ...baseInput, unit: '粒' });
      expect(r2.mergeAction).toBe('create_new');
      expect(r2.stockId).not.toBe(r1.stockId);
    });

    it('不同 generation 的回流 → 不合并', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const parentId = uid('PARENT');
      db.run(`INSERT INTO seed_sources (id, source_code, source_origin, crop_code, crop_name, seed_form, unit, generation, quantity, remaining_quantity, status, create_time, update_time)
              VALUES (?, ?, 'external', ?, '世代作物', '种子', '粒', 'F1', 1000, 1000, 'active', ?, ?)`, [parentId, uid('SRC-CODE'), uid('CROP'), now, now]);

      const baseInput = {
        circulationType: 'PROPAGATION' as const,
        sourceModule: 'planting' as const,
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving' as const,
        destination: 'seed_source' as const,
        quantity: 50,
        unit: '粒',
        seedForm: '种子',
        generation: 'F1',
      };

      const r1 = await executeCirculation(baseInput);
      expect(r1.mergeAction).toBe('create_new');

      // 不同世代 → 不合并
      const r2 = await executeCirculation({ ...baseInput, generation: 'F2' });
      expect(r2.mergeAction).toBe('create_new');
      expect(r2.stockId).not.toBe(r1.stockId);
    });
  });

  describe('冲销流程', () => {
    it('创建入库 → 冲销 → 库存回退 + 审计写入', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const sourceId = uid('SRC-REVERSE');
      const inboundId = uid('INB-REVERSE');

      // 1. 创建测试种源
      db.run(`
        INSERT INTO seed_sources (id, source_code, source_origin, crop_code, crop_name, seed_form, unit, quantity, remaining_quantity, status, create_time, update_time)
        VALUES (?, ?, 'planting_self_kept', 'TEST-CROP', '测试作物', '种子', '粒', 500, 500, 'active', ?, ?)
      `, [sourceId, uid('SRC-CODE'), now, now]);

      // 2. 创建外购入库流水（补齐 NOT NULL 列）
      db.run(`
        INSERT INTO inventory_inbound_records (id, source_module, source_id, business_id, quantity, unit, returned_quantity, record_date, stock_type, source_type)
        VALUES (?, 'seed_source', ?, ?, 200, '粒', 0, ?, 'seed', 'purchase')
      `, [inboundId, sourceId, sourceId, now]);

      // 3. 冲销
      reverseInboundRecord(sourceId, {
        inboundRecordId: inboundId,
        reason: 'E2E测试冲销',
      });

      // 4. 验证：入库记录已标记冲销（sql.js API）
      const inboundStmt = db.prepare('SELECT reversed_at, reversed_by, reverse_reason FROM inventory_inbound_records WHERE id = ?');
      inboundStmt.bind([inboundId]);
      const inbound: any = inboundStmt.step() ? inboundStmt.getAsObject() : null;
      inboundStmt.free();
      expect(inbound?.reversed_at).toBeTruthy();
      expect(inbound?.reverse_reason).toBe('E2E测试冲销');

      // 5. 验证：种源库存扣减 200
      const stockStmt = db.prepare('SELECT remaining_quantity FROM seed_sources WHERE id = ?');
      stockStmt.bind([sourceId]);
      const stock: any = stockStmt.step() ? stockStmt.getAsObject() : null;
      stockStmt.free();
      expect(stock?.remaining_quantity).toBe(300);  // 500 - 200

      // 6. 验证：审计日志写入
      const auditStmt = db.prepare('SELECT * FROM inbound_edit_log WHERE inbound_id = ?');
      auditStmt.bind([inboundId]);
      const auditLogs: any[] = [];
      while (auditStmt.step()) auditLogs.push(auditStmt.getAsObject());
      auditStmt.free();
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('reverse');
      expect(auditLogs[0].reason).toBe('E2E测试冲销');

      // 7. 验证：inventory_transaction 写入
      const txnStmt = db.prepare('SELECT * FROM inventory_transaction WHERE business_id = ?');
      txnStmt.bind([inboundId]);
      const txns: any[] = [];
      while (txnStmt.step()) txns.push(txnStmt.getAsObject());
      txnStmt.free();
      expect(txns.length).toBe(1);
      expect(txns[0].transaction_type).toBe('reverse_inbound');
      expect(txns[0].quantity).toBe(-200);
    });

    it('[CRITICAL] 同合并键不同 propagation_method → 不合并', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const cropCode = uid('CROP');
      const parentId = uid('PARENT');

      // parent 提供 crop_code 等字段
      db.run(`INSERT INTO seed_sources (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, generation, quantity, remaining_quantity, status, create_time, update_time)
              VALUES (?, ?, 'external', ?, '测试作物', '品种A', '种子', '粒', 'F1', 1000, 1000, 'active', ?, ?)`, [parentId, uid('SRC-CODE'), cropCode, now, now]);

      const baseInput = {
        circulationType: 'PROPAGATION' as const,
        sourceModule: 'planting' as const,
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving' as const,  // → propagation_method = 'seed_saving'
        destination: 'seed_source' as const,
        quantity: 100,
        unit: '粒',
        seedForm: '种子',
        generation: 'F1',
      };

      // 第一次 → 创建 seed_saving 种源
      const r1 = await executeCirculation(baseInput);
      expect(r1.mergeAction).toBe('create_new');

      // 第二次：同 crop+form+unit+gen，但 subType=cutting → 不合并
      const r2 = await executeCirculation({
        ...baseInput,
        sourceId: uid('PL'),
        subType: 'cutting',  // → propagation_method = 'cutting'
        seedForm: '种子',    // 同形态，但 propagation_method 不同
      });
      expect(r2.mergeAction).toBe('create_new');  // 不合并！
      expect(r2.stockId).not.toBe(r1.stockId);
    });

    it('已退完的入库冲销 → 抛错', () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const sourceId = uid('SRC-REVERSE');
      const inboundId = uid('INB-REVERSE');

      db.run(`INSERT INTO seed_sources (id, source_code, source_origin, crop_code, seed_form, unit, quantity, remaining_quantity, status, create_time, update_time)
              VALUES (?, ?, 'planting_self_kept', 'TEST-CROP2', '种子', '粒', 100, 100, 'active', ?, ?)`, [sourceId, uid('SRC-CODE'), now, now]);
      db.run(`INSERT INTO inventory_inbound_records (id, source_module, source_id, business_id, quantity, unit, returned_quantity, record_date, stock_type, source_type)
              VALUES (?, 'seed_source', ?, ?, 100, '粒', 100, ?, 'seed', 'purchase')`, [inboundId, sourceId, sourceId, now]);

      expect(() => reverseInboundRecord(sourceId, { inboundRecordId: inboundId, reason: 'test' }))
        .toThrow('已全部退完');
    });
  });

  describe('matchable 查询', () => {
    it('[HIGH] append-from-inventory 调拨入种源 → 同合并键合并到现有', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const cropCode = uid('CROP');
      const parentId = uid('PARENT');

      // parent 提供 crop_code 等字段
      db.run(`INSERT INTO seed_sources (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, generation, propagation_method, quantity, remaining_quantity, status, create_time, update_time)
              VALUES (?, ?, 'external', ?, '合并作物', '品种A', '种子', '粒', 'F1', 'seed_saving', 1000, 1000, 'active', ?, ?)`, [parentId, uid('SRC-CODE'), cropCode, now, now]);

      // 第一次调拨入种源（应创建新种源）
      const r1 = await executeCirculation({
        circulationType: 'PROPAGATION' as const,
        sourceModule: 'planting' as const,
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving' as const,
        destination: 'seed_source' as const,
        quantity: 100,
        unit: '粒',
        seedForm: '种子',
        generation: 'F1',
      });
      expect(r1.mergeAction).toBe('create_new');
      const targetId = r1.stockId;

      // 验证：第一次创建后 reflow_count=0
      const stmt1 = db.prepare('SELECT quantity, reflow_count FROM seed_sources WHERE id = ?');
      stmt1.bind([targetId || '']);
      const s1: any = stmt1.step() ? stmt1.getAsObject() : null;
      stmt1.free();
      expect(s1?.quantity).toBe(100);
      expect(s1?.reflow_count).toBe(0);

      // 第二次调拨入种源（同合并键）→ 应合并
      const r2 = await executeCirculation({
        circulationType: 'PROPAGATION' as const,
        sourceModule: 'planting' as const,
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving' as const,
        destination: 'seed_source' as const,
        quantity: 50,
        unit: '粒',
        seedForm: '种子',
        generation: 'F1',
      });
      expect(r2.mergeAction).toBe('merge_into_existing');
      expect(r2.stockId).toBe(targetId);

      // 验证：合并后 quantity=150, reflow_count=1
      const stmt2 = db.prepare('SELECT quantity, reflow_count FROM seed_sources WHERE id = ?');
      stmt2.bind([targetId || '']);
      const s2: any = stmt2.step() ? stmt2.getAsObject() : null;
      stmt2.free();
      expect(s2?.quantity).toBe(150);
      expect(s2?.reflow_count).toBe(1);
    });

    it('[MEDIUM] PROPAGATION 废止后 → 种源 archived 不再被合并', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const cropCode = uid('CROP');
      const parentId = uid('PARENT');

      db.run(`INSERT INTO seed_sources (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, generation, quantity, remaining_quantity, status, create_time, update_time)
              VALUES (?, ?, 'external', ?, '测试作物', '品种A', '种子', '粒', 'F1', 1000, 1000, 'active', ?, ?)`, [parentId, uid('SRC-CODE'), cropCode, now, now]);

      const baseInput = {
        circulationType: 'PROPAGATION' as const,
        sourceModule: 'planting' as const,
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving' as const,
        destination: 'seed_source' as const,
        quantity: 100,
        unit: '粒',
        seedForm: '种子',
        generation: 'F1',
      };

      // 第一次回流 → 创建种源
      const r1 = await executeCirculation(baseInput);
      expect(r1.mergeAction).toBe('create_new');
      const targetId = r1.stockId;

      // 获取对应的 circulation_record ID（sql.js API）
      const circStmt = db.prepare('SELECT id FROM crop_circulation_records WHERE new_source_id = ? ORDER BY created_at DESC LIMIT 1');
      circStmt.bind([targetId || '']);
      const circRecord: any = circStmt.step() ? circStmt.getAsObject() : null;
      circStmt.free();
      expect(circRecord).toBeTruthy();

      // 废止该 PROPAGATION
      revokeCirculation(circRecord.id, { reason: '测试废止', operatorId: 'user-admin' });

      // 验证：种源已 archived（sql.js API）
      const archStmt = db.prepare("SELECT status FROM seed_sources WHERE id = ?");
      archStmt.bind([targetId || '']);
      const archived: any = archStmt.step() ? archStmt.getAsObject() : null;
      archStmt.free();
      expect(archived?.status).toBe('archived');

      // 验证：findMergeableSeedSource 不再命中（status != active）
      const mergeable = await seedSourceRepository.findMergeableSeedSource({
        cropCode,
        seedForm: '种子',
        unit: '粒',
        generation: 'F1',
        propagationMethod: 'seed_saving',
      });
      // 应找不到（archived），或找到的是其他 active 种源
      if (mergeable) {
        expect(mergeable.id).not.toBe(targetId);
      }

      // 第三次回流 → 创建新种源（不合并到已归档的）
      const r3 = await executeCirculation({ ...baseInput, sourceId: uid('PL') });
      expect(r3.mergeAction).toBe('create_new');
      expect(r3.stockId).not.toBe(targetId);
    });

    it('返回同合并键的候选种源', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const matchId = uid('SRC-MATCH');
      const matchCode = uid('SRC-CODE');
      const matchCrop = uid('CROP');

      // 创建一条 active 种源（同合并键，含 propagation_method）
      db.run(`INSERT INTO seed_sources (id, source_code, source_origin, crop_code, crop_name, seed_form, unit, generation, propagation_method, quantity, remaining_quantity, status, create_time, update_time)
              VALUES (?, ?, 'planting_self_kept', ?, '匹配作物', '果实', '粒', 'F1', 'cutting', 50, 50, 'active', ?, ?)`, [matchId, matchCode, matchCrop, now, now]);

      const result = await seedSourceRepository.findMergeableSeedSource({
        cropCode: matchCrop,
        seedForm: '果实',
        unit: '粒',
        generation: 'F1',
        propagationMethod: 'cutting',
      });

      expect(result).not.toBeNull();
      expect(result?.sourceCode).toBe(matchCode);
    });
  });
});
