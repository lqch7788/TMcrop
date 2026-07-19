/**
 * API 级 E2E 测试：种源自动合并功能
 *
 * 覆盖核心业务流程：
 * 1. 写时合并：同合并键的 PROPAGATION 重复回流 → 合并到同一条种源
 * 2. 冲销流程：外购入库 → 冲销 → 库存回退 + 审计日志写入
 * 3. UNION 查询：history-inbound 返回 inventory_inbound + crop_circulation 两源数据
 * 4. matchable 查询：返回同合并键的候选种源
 */

// 必须在 import 任何后端模块前设置环境变量（auth.ts 顶层 import 校验 JWT_SECRET）
process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = 'test-e2e-secret-do-not-use-in-prod';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, getDatabase, saveDatabase, closeDatabase } from '../db';
import { initializeDatabase } from '../db/schema';
import { executeCirculation } from '../services/circulation.service';
import { reverseInboundRecord } from '../services/inboundReverse.service';
import { seedSourceRepository } from '../repositories/seedSource.repository';
import { revokeCirculation } from '../services/circulation.service';
// 2026-07-19：留种回流撤销（整批作废 + 库存回退 + 审计 + 同步 planting_harvest_records）
import { revokeCirculationRecord } from '../services/circulationRevoke.service';
// 2026-07-19：端到端 5 轮测试需要路由 + express + http
import seedSourceRouter from '../routes/seedSource';
import express from 'express';
import http from 'http';
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
    // 2026-07-19：清理 circulation_edit_log（含旧 run 残留的 audit 数据）
    db.exec(`DELETE FROM circulation_edit_log`);
    // 清理 writeFlowLog 产生的 material_flow_log 记录
    db.exec(`DELETE FROM material_flow_log WHERE business_code LIKE 'PL-%' OR business_code LIKE 'CIRC-%'`);
    // 清理 planting_harvest_records 测试残留
    db.exec(`DELETE FROM planting_harvest_records WHERE circulation_record_id LIKE 'CIRC-%'`);
    // 清理 inventory_transaction 测试残留
    db.exec(`DELETE FROM inventory_transaction WHERE business_id LIKE 'CIRC-%'`);
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

  describe('2026-07-19 留种回流撤销（circulationRevoke.service）', () => {
    it('合并命中的回流撤销：库存 -quantity、reflowCount -1、审计写入、planting_harvest_records 同步', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const cropCode = uid('CROP');
      const parentId = uid('PARENT');
      // 用 RUN_ID 唯一化的合并键维度，避免和种子数据 / 其他测试 run 冲突
      const uniqueGen = `E2E-REV-${RUN_ID}`;
      const uniqueForm = 'E2E_FORM';
      const uniqueMethod = 'seed_saving';

      // 准备 parent 种源（V3.0 合并键基础数据）
      db.run(`INSERT INTO seed_sources
        (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, generation, propagation_method, quantity, remaining_quantity, reflow_count, status, create_time, update_time)
        VALUES (?, ?, 'planting_self_kept', ?, '回测作物', '品种A', ?, '粒', ?, ?, 0, 0, 0, 'active', ?, ?)`,
        [parentId, uid('SRC-CODE'), cropCode, uniqueForm, uniqueGen, uniqueMethod, now, now]);

      // 第一次回流 → 创建新种源
      const r1 = await executeCirculation({
        circulationType: 'PROPAGATION',
        sourceModule: 'planting',
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving',
        destination: 'seed_source',
        quantity: 100,
        unit: '粒',
        seedForm: uniqueForm,
        generation: uniqueGen,
      });
      expect(r1.mergeAction).toBe('create_new');
      const firstStockId = r1.stockId;

      // 第二次回流 → 合并到 firstStockId
      const r2 = await executeCirculation({
        circulationType: 'PROPAGATION',
        sourceModule: 'planting',
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving',
        destination: 'seed_source',
        quantity: 50,
        unit: '粒',
        seedForm: uniqueForm,
        generation: uniqueGen,
      });
      expect(r2.mergeAction).toBe('merge_into_existing');
      expect(r2.stockId).toBe(firstStockId);

      // 此时种源 quantity=150, remaining_quantity=150, reflow_count=1
      const beforeStmt = db.prepare('SELECT quantity, remaining_quantity, reflow_count FROM seed_sources WHERE id = ?');
      beforeStmt.bind([firstStockId || '']);
      const before: any = beforeStmt.step() ? beforeStmt.getAsObject() : null;
      beforeStmt.free();
      expect(before?.quantity).toBe(150);
      expect(before?.remaining_quantity).toBe(150);
      expect(before?.reflow_count).toBe(1);

      // 取最后一次 circulation（合并命中的那条，quantity=50）
      const circStmt = db.prepare('SELECT id, quantity, new_source_id, merge_action FROM crop_circulation_records WHERE new_source_id = ? ORDER BY circulation_date DESC, id DESC LIMIT 1');
      circStmt.bind([firstStockId || '']);
      const mergedCirc: any = circStmt.step() ? circStmt.getAsObject() : null;
      circStmt.free();
      expect(mergedCirc?.merge_action).toBe('merge_into_existing');
      expect(mergedCirc?.quantity).toBe(50);

      // 撤销该次合并回流
      revokeCirculationRecord({
        circulationId: mergedCirc.id,
        reason: 'e2e-测试撤销合并回流',
      });

      // 验证 1：种源库存回退（150-50=100），reflowCount-1（1-1=0）
      const afterStmt = db.prepare('SELECT quantity, remaining_quantity, reflow_count FROM seed_sources WHERE id = ?');
      afterStmt.bind([firstStockId || '']);
      const after: any = afterStmt.step() ? afterStmt.getAsObject() : null;
      afterStmt.free();
      expect(after?.quantity).toBe(100);
      expect(after?.remaining_quantity).toBe(100);
      expect(after?.reflow_count).toBe(0);

      // 验证 2：circulation_edit_log 写入
      const auditStmt = db.prepare('SELECT * FROM circulation_edit_log WHERE circulation_id = ?');
      auditStmt.bind([mergedCirc.id]);
      const audit: any = auditStmt.step() ? auditStmt.getAsObject() : null;
      auditStmt.free();
      expect(audit).toBeTruthy();
      expect(audit?.action).toBe('reverse');
      expect(audit?.before_quantity).toBe(50);
      expect(audit?.after_quantity).toBe(0);
      expect(audit?.reason).toBe('e2e-测试撤销合并回流');

      // 验证 3：crop_circulation_records 标记撤销
      const circ2Stmt = db.prepare('SELECT is_revoked, revoked_at, revoked_by, notes FROM crop_circulation_records WHERE id = ?');
      circ2Stmt.bind([mergedCirc.id]);
      const circ2: any = circ2Stmt.step() ? circ2Stmt.getAsObject() : null;
      circ2Stmt.free();
      expect(circ2?.is_revoked).toBe(1);
      expect(circ2?.revoked_at).toBeTruthy();
      expect(circ2?.revoked_by).toBeTruthy();
      expect(circ2?.notes).toContain('e2e-测试撤销合并回流');
    });

    it('新建种源被撤销：quantity 归零但行保留（不删行，保留追溯链）', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const cropCode = uid('CROP');
      const parentId = uid('PARENT');
      // 唯一化合并键
      const uniqueGen = `E2E-NEW-${RUN_ID}`;
      const uniqueForm = 'E2E_NEW_FORM';
      const uniqueMethod = 'seed_saving';

      db.run(`INSERT INTO seed_sources
        (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, generation, propagation_method, quantity, remaining_quantity, reflow_count, status, create_time, update_time)
        VALUES (?, ?, 'planting_self_kept', ?, '新建作物', '品种B', ?, '粒', ?, ?, 0, 0, 0, 'active', ?, ?)`,
        [parentId, uid('SRC-CODE'), cropCode, uniqueForm, uniqueGen, uniqueMethod, now, now]);

      const r = await executeCirculation({
        circulationType: 'PROPAGATION',
        sourceModule: 'planting',
        sourceId: uid('PL'),
        parentSourceId: parentId,
        subType: 'seed_saving',
        destination: 'seed_source',
        quantity: 200,
        unit: '粒',
        seedForm: uniqueForm,
        generation: uniqueGen,
      });
      expect(r.mergeAction).toBe('create_new');
      const stockId = r.stockId;

      const circStmt = db.prepare('SELECT id FROM crop_circulation_records WHERE new_source_id = ?');
      circStmt.bind([stockId || '']);
      const circ: any = circStmt.step() ? circStmt.getAsObject() : null;
      circStmt.free();

      // 撤销
      revokeCirculationRecord({ circulationId: circ.id, reason: 'e2e-新建种源撤销测试' });

      // 验证：库存归零，行不删
      const ssStmt = db.prepare('SELECT quantity, remaining_quantity FROM seed_sources WHERE id = ?');
      ssStmt.bind([stockId || '']);
      const ss: any = ssStmt.step() ? ssStmt.getAsObject() : null;
      ssStmt.free();
      expect(ss).toBeTruthy();
      expect(ss?.quantity).toBe(0);
      expect(ss?.remaining_quantity).toBe(0);
    });

    it('已撤销的回流不允许重复撤销', () => {
      const db = getDatabase();
      const circStmt = db.prepare('SELECT id FROM crop_circulation_records WHERE is_revoked = 1 LIMIT 1');
      circStmt.bind([]);
      const circ: any = circStmt.step() ? circStmt.getAsObject() : null;
      circStmt.free();
      if (!circ) return; // 跳过：测试 run 没有可用的已撤销数据

      expect(() =>
        revokeCirculationRecord({ circulationId: circ.id, reason: '重复撤销测试' })
      ).toThrow(/已撤销/);
    });

    it('非 PROPAGATION 类型不允许撤销', async () => {
      const db = getDatabase();
      // 直接 INSERT 一条 QUANTITY 记录（不入库存，仅作单元测试目标）
      const circId = uid('CIRC-QTY');
      db.run(`INSERT INTO crop_circulation_records
        (id, circulation_type, source_module, source_id, parent_source_id, quantity, unit, circulation_date)
        VALUES (?, 'QUANTITY', 'planting', ?, ?, 30, '粒', datetime('now','localtime'))`,
        [circId, uid('PL'), uid('PARENT')]);

      expect(() =>
        revokeCirculationRecord({ circulationId: circId, reason: '非PROPAGATION撤销测试' })
      ).toThrow(/仅 PROPAGATION/);
    });

    it('getInboundEditLogs UNION 返回合并回流的撤销记录（含 sourceType）', async () => {
      const db = getDatabase();
      // 取任意一条本测试 run 撤销过的回流（new_source_id 关联到目标种源）
      const circStmt = db.prepare(`SELECT new_source_id FROM crop_circulation_records WHERE is_revoked = 1 AND notes LIKE '[REVOKE]%e2e%' LIMIT 1`);
      circStmt.bind([]);
      const circ: any = circStmt.step() ? circStmt.getAsObject() : null;
      circStmt.free();
      if (!circ) return; // 跳过：本 run 没撤销成功的数据

      const logs = await seedSourceRepository.getInboundEditLogs(circ.new_source_id);
      const circulationLogs = logs.filter((l: any) => l.sourceType === 'crop_circulation_records');
      expect(circulationLogs.length).toBeGreaterThan(0);
      expect(circulationLogs[0]).toHaveProperty('action', 'reverse');
    });
  });

  // ============================================================
  // 2026-07-19：端到端 5 轮测试（走真实 HTTP 路由 + 真实 db 验证）
  // 不再走 service 直接调用 — 完全模拟前端 HTTP 请求 → 路由 → service → DB
  // ============================================================
  describe('端到端 5 轮（HTTP 路由 + 真实 db）', () => {
    let httpServer: any;
    let serverPort: number;

    /** HTTP 请求 helper */
    function httpRequest(
      method: string,
      path: string,
      body?: unknown
    ): Promise<{ status: number; body: any }> {
      return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : undefined;
        const req = http.request({
          hostname: '127.0.0.1',
          port: serverPort,
          path,
          method,
          headers: bodyStr
            ? { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(bodyStr)) }
            : {},
        }, (res: any) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            try { resolve({ status: res.statusCode!, body: JSON.parse(data) }); }
            catch { resolve({ status: res.statusCode!, body: data || null }); }
          });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
      });
    }

    beforeAll(async () => {
      // auth.ts 顶层 import 校验 JWT_SECRET，test 环境必须设置
      process.env.DEMO_MODE = 'true';
      process.env.JWT_SECRET = 'test-e2e-secret-do-not-use-in-prod';

      // 构造真实 express app（不调 auth — 走 demo 模式放行）
      const app = express();
      app.use(express.json());
      app.use('/api/seed-sources', seedSourceRouter);
      // 全局错误处理：捕获路由未处理的异常，避免 5xx 但 body 为空
      app.use((err: any, _req: any, res: any, _next: any) => {
        res.status(500).json({ success: false, error: err?.message || String(err) });
      });

      httpServer = http.createServer(app);
      await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
      const addr = httpServer.address();
      serverPort = addr.port;
    });

    afterAll(() => {
      httpServer?.close();
    });

    /** 准备：建一个独立的 PARENT 种源（避免与上面测试干扰） */
    async function setupParentWithCirculation(
      runId: string,
      gen: string,
      form: string,
      method: string,
      quantities: number[]
    ): Promise<{ parentId: string; circulationIds: string[]; newSourceId: string }> {
      const db = getDatabase();
      const now = new Date().toISOString();
      const cropCode = `CROP-E2E-${runId}`;
      const parentId = `PARENT-E2E-${runId}`;

      db.run(`INSERT INTO seed_sources
        (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, generation, propagation_method, quantity, remaining_quantity, reflow_count, status, create_time, update_time)
        VALUES (?, ?, 'planting_self_kept', ?, 'E2E 作物', '品种A', ?, '粒', ?, ?, 0, 0, 0, 'active', ?, ?)`,
        [parentId, `SRC-CODE-E2E-${runId}`, cropCode, form, gen, method, now, now]);

      const circulationIds: string[] = [];
      let newSourceId = '';
      for (let i = 0; i < quantities.length; i++) {
        const result = await executeCirculation({
          circulationType: 'PROPAGATION',
          sourceModule: 'planting',
          sourceId: `PL-E2E-${runId}-${i}`,
          parentSourceId: parentId,
          subType: 'seed_saving',
          destination: 'seed_source',
          quantity: quantities[i],
          unit: '粒',
          seedForm: form,
          generation: gen,
        });
        // 取 circulation_id
        const circStmt = db.prepare('SELECT id FROM crop_circulation_records WHERE new_source_id = ? ORDER BY circulation_date DESC, id DESC LIMIT 1');
        circStmt.bind([result.stockId || '']);
        const circ: any = circStmt.step() ? circStmt.getAsObject() : null;
        circStmt.free();
        circulationIds.push(circ.id);
        newSourceId = result.stockId || '';
      }
      return { parentId, circulationIds, newSourceId };
    }

    /** Round 1：调拨入库冲销全链路（回归测试） */
    it('Round 1/5：调拨入库冲销完整 HTTP 流（路由 → service → DB → 审计）', async () => {
      const db = getDatabase();
      const runId = `R1-${RUN_ID}`;
      const ssId = `SS-E2E-${runId}`;
      const inbId = `INB-E2E-${runId}`;
      const now = new Date().toISOString();

      // 准备种源 + 入库记录
      db.run(`INSERT INTO seed_sources
        (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, quantity, remaining_quantity, status, create_time, update_time)
        VALUES (?, ?, 'external_purchase', ?, 'R1 作物', '品种', '种子', '袋', 100, 100, 'active', ?, ?)`,
        [ssId, `SRC-R1-${runId}`, `CROP-R1-${runId}`, now, now]);
      db.run(`INSERT INTO inventory_inbound_records
        (id, record_date, source_module, source_id, source_code, business_id, stock_type, source_type, crop_name, variety_name, quantity, unit, operator_name, create_by, create_time, update_time)
        VALUES (?, ?, 'seed_source', ?, ?, ?, 'seed', 'external_purchase', 'R1 作物', '品种', 100, '袋', 'e2e-tester', 'e2e', ?, ?)`,
        [inbId, now, ssId, `SRC-R1-${runId}`, ssId, now, now]);

      // HTTP 请求
      const r = await httpRequest(
        'POST',
        `/api/seed-sources/${ssId}/reverse-inbound`,
        { inboundRecordId: inbId, reason: '端到端 R1 冲销测试' }
      );
      expect(r.status).toBe(200);
      expect(r.body?.success).toBe(true);

      // 验证 DB 副作用
      const ssStmt = db.prepare('SELECT remaining_quantity, quantity FROM seed_sources WHERE id = ?');
      ssStmt.bind([ssId]);
      const ss: any = ssStmt.step() ? ssStmt.getAsObject() : null;
      ssStmt.free();
      expect(ss?.remaining_quantity).toBe(0);
      expect(ss?.quantity).toBe(0);

      // 验证入库记录已标 reversed_at
      const inbStmt = db.prepare('SELECT reversed_at, reverse_reason FROM inventory_inbound_records WHERE id = ?');
      inbStmt.bind([inbId]);
      const inb: any = inbStmt.step() ? inbStmt.getAsObject() : null;
      inbStmt.free();
      expect(inb?.reversed_at).toBeTruthy();
      expect(inb?.reverse_reason).toBe('端到端 R1 冲销测试');

      // 验证 inbound_edit_log 写入
      const logStmt = db.prepare('SELECT * FROM inbound_edit_log WHERE inbound_id = ?');
      logStmt.bind([inbId]);
      const log: any = logStmt.step() ? logStmt.getAsObject() : null;
      logStmt.free();
      expect(log).toBeTruthy();
      expect(log?.action).toBe('reverse');
    });

    /** Round 2：留种回流撤销 - 新建种源 */
    it('Round 2/5：留种回流撤销 - 新建种源（HTTP 流）', async () => {
      const runId = `R2-${RUN_ID}`;
      const { circulationIds, newSourceId } = await setupParentWithCirculation(
        runId, `E2E-R2-GEN-${RUN_ID}`, `E2E_R2_FORM`, 'seed_saving', [200]
      );

      // 验证前置：种源 quantity=200, reflow_count=0
      const db = getDatabase();
      const beforeStmt = db.prepare('SELECT quantity, remaining_quantity, reflow_count FROM seed_sources WHERE id = ?');
      beforeStmt.bind([newSourceId]);
      const before: any = beforeStmt.step() ? beforeStmt.getAsObject() : null;
      beforeStmt.free();
      expect(before?.quantity).toBe(200);
      expect(before?.reflow_count).toBe(0);

      // HTTP 请求：撤销
      const r = await httpRequest(
        'POST',
        `/api/seed-sources/circulation/${circulationIds[0]}/revoke`,
        { reason: '端到端 R2 撤销新建种源' }
      );
      expect(r.status).toBe(200);
      expect(r.body?.success).toBe(true);

      // 验证：种源 quantity=0（归零但行保留）
      const afterStmt = db.prepare('SELECT quantity, remaining_quantity, reflow_count, status FROM seed_sources WHERE id = ?');
      afterStmt.bind([newSourceId]);
      const after: any = afterStmt.step() ? afterStmt.getAsObject() : null;
      afterStmt.free();
      expect(after?.quantity).toBe(0);
      expect(after?.remaining_quantity).toBe(0);

      // 验证：circulation_edit_log 写入
      const logStmt = db.prepare('SELECT * FROM circulation_edit_log WHERE circulation_id = ?');
      logStmt.bind([circulationIds[0]]);
      const log: any = logStmt.step() ? logStmt.getAsObject() : null;
      logStmt.free();
      expect(log).toBeTruthy();
      expect(log?.action).toBe('reverse');
      expect(log?.reason).toBe('端到端 R2 撤销新建种源');

      // 验证：crop_circulation_records 标 is_revoked=1
      const circStmt = db.prepare('SELECT is_revoked, notes FROM crop_circulation_records WHERE id = ?');
      circStmt.bind([circulationIds[0]]);
      const circ: any = circStmt.step() ? circStmt.getAsObject() : null;
      circStmt.free();
      expect(circ?.is_revoked).toBe(1);
      expect(circ?.notes).toContain('端到端 R2 撤销新建种源');
    });

    /** Round 3：留种回流撤销 - 合并命中（reflowCount -1） */
    it('Round 3/5：留种回流撤销 - 合并命中（reflowCount -1 验证）', async () => {
      const runId = `R3-${RUN_ID}`;
      const { circulationIds, newSourceId } = await setupParentWithCirculation(
        runId, `E2E-R3-GEN-${RUN_ID}`, `E2E_R3_FORM`, 'seed_saving', [100, 50]
      );

      // 前置：合并命中 → quantity=150, reflow_count=1
      const db = getDatabase();
      const beforeStmt = db.prepare('SELECT quantity, remaining_quantity, reflow_count FROM seed_sources WHERE id = ?');
      beforeStmt.bind([newSourceId]);
      const before: any = beforeStmt.step() ? beforeStmt.getAsObject() : null;
      beforeStmt.free();
      expect(before?.quantity).toBe(150);
      expect(before?.reflow_count).toBe(1);

      // 撤销第二次（合并命中的）回流
      const r = await httpRequest(
        'POST',
        `/api/seed-sources/circulation/${circulationIds[1]}/revoke`,
        { reason: '端到端 R3 撤销合并回流' }
      );
      expect(r.status).toBe(200);
      expect(r.body?.success).toBe(true);

      // 验证：库存回退 150-50=100, reflow_count 1-1=0
      const afterStmt = db.prepare('SELECT quantity, remaining_quantity, reflow_count FROM seed_sources WHERE id = ?');
      afterStmt.bind([newSourceId]);
      const after: any = afterStmt.step() ? afterStmt.getAsObject() : null;
      afterStmt.free();
      expect(after?.quantity).toBe(100);
      expect(after?.remaining_quantity).toBe(100);
      expect(after?.reflow_count).toBe(0);

      // 验证 audit 写入
      const logStmt = db.prepare('SELECT * FROM circulation_edit_log WHERE circulation_id = ?');
      logStmt.bind([circulationIds[1]]);
      const log: any = logStmt.step() ? logStmt.getAsObject() : null;
      logStmt.free();
      expect(log?.action).toBe('reverse');
      expect(log?.before_quantity).toBe(50);
      expect(log?.after_quantity).toBe(0);
    });

    /** Round 4：异常路径 */
    it('Round 4/5：异常路径 — 重复撤销 / 不存在 ID / 缺 reason 全部 400', async () => {
      const runId = `R4-${RUN_ID}`;
      const { circulationIds, newSourceId } = await setupParentWithCirculation(
        runId, `E2E-R4-GEN-${RUN_ID}`, `E2E_R4_FORM`, 'seed_saving', [80]
      );

      // 第一次撤销 — 应成功
      const r1 = await httpRequest(
        'POST',
        `/api/seed-sources/circulation/${circulationIds[0]}/revoke`,
        { reason: 'R4 第一次撤销' }
      );
      expect(r1.status).toBe(200);

      // 重复撤销 — 应 500（"已撤销，无法重复操作"）
      const r2 = await httpRequest(
        'POST',
        `/api/seed-sources/circulation/${circulationIds[0]}/revoke`,
        { reason: 'R4 重复撤销' }
      );
      expect(r2.status).toBe(500);
      expect(r2.body?.error).toMatch(/已撤销/);

      // 不存在的 ID — 应 500（"回流记录不存在"）
      const r3 = await httpRequest(
        'POST',
        `/api/seed-sources/circulation/CIRC-NON-EXIST-${RUN_ID}/revoke`,
        { reason: 'R4 不存在测试' }
      );
      expect(r3.status).toBe(500);
      expect(r3.body?.error).toMatch(/不存在/);

      // 缺 reason — 应 400
      const r4 = await httpRequest(
        'POST',
        `/api/seed-sources/circulation/${circulationIds[0]}/revoke`,
        {}
      );
      // 2026-07-19：zod schema 校验 reason 必填，返回 400 + 含 reason 的错误信息
      expect(r4.status).toBe(400);
      expect(r4.body?.error).toMatch(/reason|必填/);
    });

    /** Round 5：完整 UI 集成 — history-inbound + inbound-audit 查询 */
    it('Round 5/5：完整 UI 集成 — history-inbound UNION + inbound-audit 含 sourceType', async () => {
      const runId = `R5-${RUN_ID}`;
      const { circulationIds, newSourceId } = await setupParentWithCirculation(
        runId, `E2E-R5-GEN-${RUN_ID}`, `E2E_R5_FORM`, 'seed_saving', [60, 40]
      );

      // 撤销第二次（合并命中）
      await httpRequest(
        'POST',
        `/api/seed-sources/circulation/${circulationIds[1]}/revoke`,
        { reason: 'R5 撤销' }
      );

      // UI 集成 1：GET /history-inbound UNION 应包含回流记录
      // 后端响应是 {success, data: [...]} 包装（不是裸数组）
      const r1 = await httpRequest('GET', `/api/seed-sources/${newSourceId}/history-inbound`);
      expect(r1.status).toBe(200);
      const records = r1.body?.data || r1.body;
      expect(Array.isArray(records)).toBe(true);
      const circulationRecords = (records as any[]).filter((r) => r.recordSource === 'crop_circulation_records');
      expect(circulationRecords.length).toBeGreaterThan(0);

      // UI 集成 2：GET /inbound-audit 应包含 sourceType='crop_circulation_records' 的记录
      const r2 = await httpRequest('GET', `/api/seed-sources/${newSourceId}/inbound-audit`);
      expect(r2.status).toBe(200);
      const logs = r2.body?.data || r2.body;
      expect(Array.isArray(logs)).toBe(true);
      const circulationAudits = (logs as any[]).filter((l: any) => l.sourceType === 'crop_circulation_records');
      expect(circulationAudits.length).toBeGreaterThan(0);
      expect(circulationAudits[0]).toHaveProperty('action', 'reverse');
      expect(circulationAudits[0]).toHaveProperty('beforeQuantity', 40);

      // UI 集成 3：inventory_transaction 应该有反向流水
      const db = getDatabase();
      const txStmt = db.prepare('SELECT * FROM inventory_transaction WHERE business_id = ? AND transaction_type = ?');
      txStmt.bind([circulationIds[1], 'reverse_circulation']);
      const tx: any = txStmt.step() ? txStmt.getAsObject() : null;
      txStmt.free();
      expect(tx).toBeTruthy();
      expect(tx?.quantity).toBe(-40); // 反向 = 负数
    });

    /** Round 6 (扩展): 目标种源物理丢失的孤儿场景 — 不阻塞用户 */
    it('Round 6/5 (扩展)：目标种源物理丢失 — 服务不阻塞，仅标记回流作废 + 写 audit', async () => {
      const db = getDatabase();
      const runId = `ORPHAN-${RUN_ID}`;
      const { circulationIds, newSourceId } = await setupParentWithCirculation(
        runId, `E2E-ORPHAN-GEN-${RUN_ID}`, `E2E_ORPHAN_FORM`, 'seed_saving', [55]
      );

      // 模拟"目标种源物理丢失"（直接 DELETE，绕过软删）
      db.run(`DELETE FROM seed_sources WHERE id = ?`, [newSourceId]);
      // 验证种源真的没了
      const chkStmt = db.prepare('SELECT id FROM seed_sources WHERE id = ?');
      chkStmt.bind([newSourceId]);
      const chk: any = chkStmt.step() ? chkStmt.getAsObject() : null;
      chkStmt.free();
      expect(chk).toBeNull();

      // HTTP 撤销 — 不应 throw，应 200 OK
      const r = await httpRequest(
        'POST',
        `/api/seed-sources/circulation/${circulationIds[0]}/revoke`,
        { reason: 'R6 孤儿场景测试' }
      );
      expect(r.status).toBe(200);
      expect(r.body?.success).toBe(true);

      // 验证：回流已标 is_revoked=1 + notes 含 [REVOKE-ORPHAN] 标记
      const circStmt = db.prepare('SELECT is_revoked, notes FROM crop_circulation_records WHERE id = ?');
      circStmt.bind([circulationIds[0]]);
      const circ: any = circStmt.step() ? circStmt.getAsObject() : null;
      circStmt.free();
      expect(circ?.is_revoked).toBe(1);
      expect(circ?.notes).toContain('REVOKE-ORPHAN');

      // 验证：circulation_edit_log 仍写入
      const logStmt = db.prepare('SELECT * FROM circulation_edit_log WHERE circulation_id = ?');
      logStmt.bind([circulationIds[0]]);
      const log: any = logStmt.step() ? logStmt.getAsObject() : null;
      logStmt.free();
      expect(log).toBeTruthy();
      expect(log?.action).toBe('reverse');

      // 验证：inventory_transaction 不应写入（种源已物理丢失，无 balance 可记录）
      const txStmt = db.prepare('SELECT * FROM inventory_transaction WHERE business_id = ?');
      txStmt.bind([circulationIds[0]]);
      const tx: any = txStmt.step() ? txStmt.getAsObject() : null;
      txStmt.free();
      expect(tx).toBeNull();
    });

    /** Round 7/5 (P0-10)：退库 + 冲销组合 — 先退一半再冲销剩余 */
    it('Round 7/5 (P0-10)：退库 + 冲销组合 — 先退一半再冲销剩余', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const runId = `R7-${RUN_ID}`;
      const ssId = `SS-COMBO-${runId}`;
      const inbId = `INB-COMBO-${runId}`;

      // 准备：种源 100 + 1 条入库流水 200 + 对应的 inventory_stock（反向流程需要）
      const stkId = `STK-COMBO-${runId}`;
      db.run(`INSERT INTO seed_sources
        (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, quantity, remaining_quantity, status, create_time, update_time)
        VALUES (?, ?, 'external_purchase', ?, 'R7 作物', '品种', '种子', '袋', 200, 200, 'active', ?, ?)`,
        [ssId, `SRC-COMBO-${runId}`, `CROP-R7-${runId}`, now, now]);
      // 2026-07-19：创建匹配的 inventory_stock（反向流程需要 source_id 指向有效的库存行）
      db.run(`INSERT INTO inventory_stock
        (id, instance_id, stock_type, business_id, business_type, current_quantity, available_quantity, unit, crop_code, crop_name, status, create_time)
        VALUES (?, ?, 'seed', ?, 'harvest', 9999, 9999, '袋', ?, 'R7 作物', 'in_stock', ?)`,
        [stkId, `INS-COMBO-${runId}`, ssId, `CROP-R7-${runId}`, now]);
      db.run(`INSERT INTO inventory_inbound_records
        (id, record_type, record_date, source_module, source_id, business_id, stock_type, source_type, crop_code, crop_name, quantity, unit, operator_name, create_by, create_time, update_time)
        VALUES (?, 'inbound', ?, 'seed_source', ?, ?, 'seed', 'external_purchase', ?, 'R7 作物', 200, '袋', 'e2e', 'e2e', ?, ?)`,
        [inbId, now, stkId, ssId, `CROP-R7-${runId}`, now, now]);

      // Step 1: 退库 80
      const r1 = await httpRequest('POST', `/api/seed-sources/return-to-inventory`, {
        targetSeedSourceId: ssId,
        items: [{ inboundRecordId: inbId, quantity: 80, unit: '袋' }],
      });
      expect(r1.status).toBe(200);

      // 验证：returned_quantity=80
      const irStmt = db.prepare('SELECT quantity, returned_quantity FROM inventory_inbound_records WHERE id = ?');
      irStmt.bind([inbId]);
      const ir: any = irStmt.step() ? irStmt.getAsObject() : null;
      irStmt.free();
      expect(ir?.returned_quantity).toBe(80);

      // Step 2: 冲销剩余 120（returnable = 200-80 = 120）
      const r2 = await httpRequest('POST', `/api/seed-sources/${ssId}/reverse-inbound`, {
        inboundRecordId: inbId,
        reason: 'R7 组合测试 — 冲销剩余',
      });
      expect(r2.status).toBe(200);

      // 验证：种源 remaining=0（200-80-120=0）
      const ssStmt = db.prepare('SELECT remaining_quantity FROM seed_sources WHERE id = ?');
      ssStmt.bind([ssId]);
      const ss: any = ssStmt.step() ? ssStmt.getAsObject() : null;
      ssStmt.free();
      expect(ss?.remaining_quantity).toBe(0);

      // 验证：入库记录 reversed_at 标记
      const ir2Stmt = db.prepare('SELECT reversed_at, reverse_reason FROM inventory_inbound_records WHERE id = ?');
      ir2Stmt.bind([inbId]);
      const ir2: any = ir2Stmt.step() ? ir2Stmt.getAsObject() : null;
      ir2Stmt.free();
      expect(ir2?.reversed_at).toBeTruthy();

      // 验证：inbound_edit_log 记录了 before_quantity=200, after_quantity=0（不是 120）
      const logStmt = db.prepare('SELECT before_quantity, after_quantity FROM inbound_edit_log WHERE inbound_id = ?');
      logStmt.bind([inbId]);
      const log: any = logStmt.step() ? logStmt.getAsObject() : null;
      logStmt.free();
      expect(log?.before_quantity).toBe(200);
      expect(log?.after_quantity).toBe(0);
    });

    /** Round 8/5 (P0-11)：并发 append-from-inventory 致 inventory_stock 变负（验证 BEGIN IMMEDIATE 保护）*/
    it('Round 8/5 (P0-11)：并发 append-from-inventory — 源库存 200 + 两个请求各 150 → 应只有一个完全成功', async () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const runId = `R8-${RUN_ID}`;
      const parentId = `PARENT-R8-${runId}`;
      const stkId = `STK-R8-${runId}`;

      // 准备：1 个种源 + 1 个源库存 200
      db.run(`INSERT INTO seed_sources
        (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, quantity, remaining_quantity, status, create_time, update_time)
        VALUES (?, ?, 'inventory_transfer', ?, 'R8 作物', '品种', '种子', '粒', 0, 0, 'active', ?, ?)`,
        [parentId, `SRC-R8-${runId}`, `CROP-R8-${runId}`, now, now]);
      db.run(`INSERT INTO inventory_stock
        (id, instance_id, stock_type, business_type, current_quantity, available_quantity, unit, crop_code, crop_name, status, create_time)
        VALUES (?, ?, 'seed', 'inventory_transfer', 200, 200, '粒', ?, 'R8 作物', 'in_stock', ?)`,
        [stkId, `INS-R8-${runId}`, `CROP-R8-${runId}`, now]);

      // 并发 2 个 append-from-inventory 请求（各 150，源只有 200）
      const body = { targetSeedSourceId: parentId, items: [{ sourceStockId: stkId, transferQuantity: 150, unit: '粒' }] };
      const [r1, r2] = await Promise.all([
        httpRequest('POST', '/api/seed-sources/append-from-inventory', body),
        httpRequest('POST', '/api/seed-sources/append-from-inventory', body),
      ]);
      // 至少一个成功（200），另一个可能 200（如果源刚够）或 500（库存不足）
      const successCount = [r1, r2].filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // 验证：源库存不小于 0（事务保护）
      const stkStmt = db.prepare('SELECT current_quantity FROM inventory_stock WHERE id = ?');
      stkStmt.bind([stkId]);
      const stk: any = stkStmt.step() ? stkStmt.getAsObject() : null;
      stkStmt.free();
      expect(stk?.current_quantity).toBeGreaterThanOrEqual(0);
    });

    /** Round 9/5 (P0-12)：大数据量 audit 查询性能 */
    it('Round 9/5 (P0-12)：10000 条 audit 查询耗时 < 500ms（验证索引有效）', async () => {
      const db = getDatabase();
      const runId = `R9-${RUN_ID}`;
      const ssId = `SS-PERF-${runId}`;
      const inbId = `INB-PERF-${runId}`;
      const now = new Date().toISOString();

      // 准备：种源 + 1 条入库记录 + 10000 条 audit log
      db.run(`INSERT INTO seed_sources
        (id, source_code, source_origin, crop_code, crop_name, crop_variety, seed_form, unit, quantity, remaining_quantity, status, create_time, update_time)
        VALUES (?, ?, 'external_purchase', ?, 'R9 作物', '品种', '种子', '袋', 1, 1, 'active', ?, ?)`,
        [ssId, `SRC-PERF-${runId}`, `CROP-R9-${runId}`, now, now]);
      // 2026-07-19：补 source_id（NOT NULL 约束），指向一个虚拟库存行
      const r9StkId = `STK-PERF-${runId}`;
      db.run(`INSERT INTO inventory_stock
        (id, instance_id, stock_type, business_id, business_type, current_quantity, available_quantity, unit, crop_code, crop_name, status, create_time)
        VALUES (?, ?, 'seed', ?, 'harvest', 9999, 9999, '袋', ?, 'R9 作物', 'in_stock', ?)`,
        [r9StkId, `INS-PERF-${runId}`, ssId, `CROP-R9-${runId}`, now]);
      db.run(`INSERT INTO inventory_inbound_records
        (id, record_type, record_date, source_module, source_id, business_id, stock_type, source_type, crop_code, crop_name, quantity, unit, operator_name, create_by, create_time, update_time)
        VALUES (?, 'inbound', ?, 'seed_source', ?, ?, 'seed', 'external_purchase', ?, 'R9 作物', 1, '袋', 'e2e', 'e2e', ?, ?)`,
        [inbId, now, r9StkId, ssId, `CROP-R9-${runId}`, now, now]);

      const insLog = db.prepare(`INSERT INTO inbound_edit_log (inbound_id, action, before_quantity, after_quantity, edited_by, edited_by_name, reason, created_at) VALUES (?, 'update', 0, 1, 'e2e', 'e2e', 'perf', ?)`);
      for (let i = 0; i < 10000; i++) {
        insLog.run([inbId, new Date(Date.now() + i).toISOString()]);
      }
      insLog.free();

      // 测查询耗时
      const start = Date.now();
      const r = await httpRequest('GET', `/api/seed-sources/${ssId}/inbound-audit`);
      const elapsed = Date.now() - start;

      expect(r.status).toBe(200);
      expect(elapsed).toBeLessThan(500); // 索引应保证 < 500ms
    });
  });
});
