/**
 * 数据同步控制器
 * 负责从 localStorage 批量导入数据到数据库
 * 注意：只同步数据库 schema 中实际存在的字段
 */

import { Request, Response, NextFunction } from 'express';
import { getDatabase, saveDatabase } from '../db';

/**
 * 同步控制器类
 */
export class SyncController {

  /**
   * 批量导入种源数据
   * POST /api/sync/seed-sources
   * Schema: id, source_code, source_name, source_type, crop_name, crop_variety,
   *         supplier_id, supplier_name, production_plan_code, quantity, unit,
   *         purchase_date, purchase_price, total_amount, used_quantity,
   *         remaining_quantity, status, remarks, create_by, create_time, update_time
   */
  async importSeedSources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `SS${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM seed_sources WHERE id = ?');
        checkStmt.bind([id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO seed_sources (
            id, source_code, source_name, source_type, crop_name, crop_variety, crop_code,
            supplier_id, supplier_name, production_plan_code, quantity, unit,
            purchase_date, purchase_price, total_amount, used_quantity,
            remaining_quantity, status, remarks, create_by, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.seedCode || item.seed_code || '',
          item.sourceName || item.source_name || '',
          item.sourceType || item.source_type || '',
          item.cropName || item.crop_name || '',
          item.cropVariety || item.crop_variety || '',
          item.cropCode || item.crop_code || item.varietyCode || '',
          item.supplierId || item.supplier_id || '',
          item.supplierName || item.supplier_name || '',
          item.productionPlanCode || item.production_plan_code || item.orderCode || '',
          item.quantity || 0,
          item.unit || '',
          item.purchaseDate || item.purchase_date || '',
          item.unitPrice || item.unit_price || 0,
          item.totalAmount || item.total_amount || 0,
          item.usedQuantity || item.used_quantity || 0,
          item.availableCount || item.available_count || item.quantity || 0,
          item.status || 'active',
          item.remarks || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'seed_sources' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入育苗数据
   * POST /api/sync/seedlings
   * Schema: id, seedling_code, source_id, source_name, production_plan_code,
   *         crop_code, crop_name, crop_variety, seedling_type, greenhouse_name,
   *         area_name, seedling_date, expected_finish_date, actual_finish_date,
   *         seedling_quantity, survival_quantity, survival_rate, planted_count,
   *         pictures, quality_grade, status, seedling_status, remarks,
   *         create_by, create_time, update_time
   */
  async importSeedlings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `SD${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM seedlings WHERE id = ?');
        checkStmt.bind([id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO seedlings (
            id, seedling_code, source_id, source_name, production_plan_code,
            crop_code, crop_name, crop_variety, seedling_type, greenhouse_name,
            area_name, seedling_date, expected_finish_date, actual_finish_date,
            seedling_quantity, survival_quantity, survival_rate, planted_count,
            pictures, quality_grade, status, seedling_status, remarks,
            create_by, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.seedlingCode || item.seedling_code || '',
          item.sourceId || item.source_id || '',
          item.sourceName || item.source_name || '',
          item.productionPlanCode || item.production_plan_code || '',
          item.cropCode || item.crop_code || '',
          item.cropName || item.crop_name || '',
          item.cropVariety || item.crop_variety || '',
          item.seedlingType || item.seedling_type || '',
          item.siteName || item.greenhouseName || item.greenhouse_name || '',
          item.areaName || item.area_name || '',
          item.startDate || item.seedlingDate || item.seedling_date || '',
          item.expectedEndDate || item.expected_finish_date || '',
          item.endDate || item.actualFinishDate || item.actual_finish_date || '',
          item.initialCount || item.seedlingQuantity || item.seedling_quantity || 0,
          item.survivalCount || item.survival_quantity || 0,
          item.survivalRate || item.survival_rate || 0,
          item.plantedCount || item.planted_count || 0,
          Array.isArray(item.pictures) ? JSON.stringify(item.pictures) : (item.pictures || '[]'),
          item.qualityGrade || item.quality_grade || '',
          item.status || 'in_progress',
          item.seedlingStatus || item.seedling_status || '',
          item.remarks || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'seedlings' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入种植数据
   * POST /api/sync/plantings
   * Schema: id, planting_code, source_type, source_id, source_name, crop_name, crop_variety,
   *         greenhouse_name, area_name, planting_date, planting_quantity, planted_quantity,
   *         survival_quantity, survival_rate, growth_status, expected_harvest_date,
   *         actual_harvest_date, harvest_quantity, status, remarks, create_by, create_time, update_time
   */
  async importPlantings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `PL${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM plantings WHERE id = ?');
        checkStmt.bind([id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO plantings (
            id, planting_code, source_type, source_id, source_name, crop_name, crop_variety,
            greenhouse_name, area_name, planting_date, planting_quantity, planted_quantity,
            survival_quantity, survival_rate, growth_status, expected_harvest_date,
            actual_harvest_date, harvest_quantity, status, remarks, create_by, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.plantCode || item.planting_code || '',
          item.sourceType || item.source_type || '',
          item.sourceId || item.source_id || '',
          item.sourceCode || item.source_name || '',
          item.cropName || item.crop_name || '',
          item.cropVariety || item.crop_variety || '',
          item.areaName || item.greenhouseName || item.greenhouse_name || '',
          item.areaName || item.area_name || '',
          item.plantingDate || item.planting_date || '',
          item.plantingCount || item.planting_quantity || 0,
          item.plantedQuantity || item.planted_quantity || 0,
          item.survivalQuantity || item.survival_quantity || 0,
          item.survivalRate || item.survival_rate || 0,
          item.growthStatus || item.growth_status || '',
          item.expectedHarvestDate || item.expected_harvest_date || '',
          item.actualHarvestDate || item.actual_harvest_date || '',
          item.harvestQuantity || item.harvest_quantity || 0,
          item.status || 'planted',
          item.remarks || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'plantings' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入采收数据
   * POST /api/sync/harvest
   * Schema: id, harvest_code, source_id, source_name, crop_name, crop_variety,
   *         greenhouse_name, harvest_date, harvest_quantity, unit, unit_price,
   *         total_amount, quality_grade, buyer_id, buyer_name, sales_channel,
   *         status, remarks, create_by, create_time, update_time
   */
  async importHarvest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `HR${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM harvest_records WHERE id = ?');
        checkStmt.bind([id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO harvest_records (
            id, harvest_code, source_id, source_name, crop_name, crop_variety,
            greenhouse_name, harvest_date, harvest_quantity, unit, unit_price,
            total_amount, quality_grade, buyer_id, buyer_name, sales_channel,
            status, remarks, create_by, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.harvestCode || item.harvest_code || '',
          item.sourceId || item.source_id || '',
          item.sourceName || item.source_name || '',
          item.cropName || item.crop_name || '',
          item.variety || item.crop_variety || '',
          item.greenhouseName || item.greenhouse_name || '',
          item.harvestDate || item.harvest_date || '',
          item.harvestQuantity || item.harvest_quantity || 0,
          item.unit || '',
          item.unitPrice || item.unit_price || 0,
          item.totalAmount || item.total_amount || 0,
          item.quality || item.quality_grade || item.grade || '',
          item.buyerId || item.buyer_id || '',
          item.buyerName || item.buyer_name || '',
          item.salesChannel || item.sales_channel || '',
          item.status || 'pending',
          item.remarks || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'harvest_records' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入实例数据
   * POST /api/sync/crop-instances
   * Schema: id, instance_code, order_id, order_code, crop_category, crop_name, crop_variety,
   *         category_code, type_code, sub_code, source_origin, source_description,
   *         source_instance_id, initial_quantity, current_quantity, planted_quantity,
   *         harvested_quantity, status, seed_entry_date, seedling_start_date,
   *         planting_date, harvest_date, create_by, create_time, update_time
   */
  async importCropInstances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `CI${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM crop_instances WHERE id = ?');
        checkStmt.bind([id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO crop_instances (
            id, instance_code, order_id, order_code, crop_category, crop_name, crop_variety,
            category_code, type_code, sub_code, source_origin, source_description,
            source_instance_id, initial_quantity, current_quantity, planted_quantity,
            harvested_quantity, status, seed_entry_date, seedling_start_date,
            planting_date, harvest_date, create_by, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.instanceCode || item.instance_code || '',
          item.orderId || item.order_id || '',
          item.orderCode || item.order_code || '',
          item.cropCategory || item.crop_category || '',
          item.cropName || item.crop_name || '',
          item.cropVariety || item.crop_variety || '',
          item.categoryCode || item.category_code || '',
          item.typeCode || item.type_code || '',
          item.subCode || item.sub_code || '',
          item.sourceOrigin || item.source_origin || '',
          item.sourceDescription || item.source_description || '',
          item.sourceInstanceId || item.source_instance_id || '',
          item.initialQuantity || item.initial_quantity || 0,
          item.currentQuantity || item.current_quantity || 0,
          item.plantedQuantity || item.planted_quantity || 0,
          item.harvestedQuantity || item.harvested_quantity || 0,
          item.status || 'seedling',
          item.seedEntryDate || item.seed_entry_date || '',
          item.seedlingStartDate || item.seedling_start_date || '',
          item.plantingDate || item.planting_date || '',
          item.harvestDate || item.harvest_date || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'crop_instances' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取所有表的数据统计
   * GET /api/sync/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDatabase();

      const tables = [
        'seed_sources',
        'seedlings',
        'plantings',
        'harvest_records',
        'crop_instances'
      ];

      const stats: Record<string, number> = {};

      for (const table of tables) {
        try {
          const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
          if (stmt.step()) {
            const result = stmt.getAsObject();
            stats[table] = result.count as number || 0;
          }
          stmt.free();
        } catch {
          stats[table] = 0;
        }
      }

      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取指定表的字段结构
   * GET /api/sync/schema/:table
   */
  async getSchema(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { table } = req.params;
      const db = getDatabase();

      // 查询表的字段信息 (使用 PRAGMA table_info)
      const stmt = db.prepare(`PRAGMA table_info(${table})`);
      const fields: string[] = [];

      while (stmt.step()) {
        const result = stmt.getAsObject();
        if (result.name) {
          fields.push(result.name as string);
        }
      }
      stmt.free();

      res.json({ success: true, data: fields });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取指定表的样本数据（用于冲突检测）
   * GET /api/sync/sample/:table?limit=100
   */
  async getSampleData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { table } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      // 防止 SQL 注入：验证表名只包含字母数字和下划线
      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        res.status(400).json({ success: false, error: '无效的表名' });
        return;
      }

      const db = getDatabase();
      const stmt = db.prepare(`SELECT * FROM ${table} LIMIT ?`);
      stmt.bind([limit]);

      const records: Record<string, any>[] = [];
      while (stmt.step()) {
        records.push(stmt.getAsObject());
      }
      stmt.free();

      res.json({ success: true, data: records });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入公告数据
   * POST /api/sync/announcements
   */
  async importAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `ann_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM announcements WHERE id = ? OR code = ?');
        checkStmt.bind([id, item.code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO announcements (
            id, code, title, type, category, priority, status,
            sender, date, deadline, read_count, recipients, content,
            create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.code || '',
          item.title || '',
          item.type || '',
          item.category || '',
          item.priority || '中',
          item.status || '草稿',
          item.sender || '',
          item.date || '',
          item.deadline || '',
          item.readCount || 0,
          item.recipients || '',
          item.content || '',
          item.createTime || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'announcements' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入指标数据
   * POST /api/sync/indicators
   */
  async importIndicators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `ind_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM indicators WHERE id = ? OR code = ?');
        checkStmt.bind([id, item.code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO indicators (
            id, code, name, category, unit, target, actual,
            trend, frequency, source, warning, weight,
            create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.code || '',
          item.name || '',
          item.category || '',
          item.unit || '',
          item.target || 0,
          item.actual || 0,
          item.trend || 'stable',
          item.frequency || '',
          item.source || '',
          item.warning || 0,
          item.weight || 0,
          item.createTime || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'indicators' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入订单数据
   * POST /api/sync/crop-orders
   */
  async importCropOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `ord_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM crop_orders WHERE id = ? OR order_code = ?');
        checkStmt.bind([id, item.orderCode || item.order_code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO crop_orders (
            id, order_code, order_name, order_type, crop_category, crop_name, crop_variety,
            quantity, unit, unit_price, total_amount, customer_name, customer_contact,
            delivery_address, order_date, expected_delivery_date, actual_delivery_date,
            status, remarks, create_by, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.orderCode || item.order_code || '',
          item.orderName || item.order_name || '',
          item.orderType || item.order_type || '',
          item.cropCategory || item.crop_category || '',
          item.cropName || item.crop_name || '',
          item.cropVariety || item.crop_variety || '',
          item.quantity || 0,
          item.unit || '',
          item.unitPrice || item.unit_price || 0,
          item.totalAmount || item.total_amount || 0,
          item.customerName || item.customer_name || '',
          item.customerContact || item.customer_contact || '',
          item.deliveryAddress || item.delivery_address || '',
          item.orderDate || item.order_date || '',
          item.expectedDeliveryDate || item.expected_delivery_date || '',
          item.actualDeliveryDate || item.actual_delivery_date || '',
          item.status || 'pending',
          item.remarks || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'crop_orders' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入技术方案数据
   * POST /api/sync/tech-solutions
   */
  async importTechSolutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `tech_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM tech_solutions WHERE id = ? OR solution_code = ?');
        checkStmt.bind([id, item.solutionCode || item.solution_code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO tech_solutions (
            id, solution_code, solution_title, crop_name, crop_code, planting_mode,
            stage, version, content, author, author_id,
            status, batch_status, approval_code, approved_at, approver,
            related_batch_code, plan_detail_file_name, priority, remarks,
            create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.solutionCode || item.solution_code || '',
          item.solutionTitle || item.solution_title || '',
          item.cropName || item.crop_name || '',
          item.cropCode || item.crop_code || '',
          item.plantingMode || item.planting_mode || '',
          item.stage || '',
          item.version || 'V1.0',
          item.content || '',
          item.author || '',
          item.authorId || item.author_id || '',
          item.status || 'draft',
          item.batchStatus || item.batch_status || 'draft',
          item.approvalCode || item.approval_code || '',
          item.approvedAt || item.approved_at || '',
          item.approver || '',
          item.relatedBatchCode || item.related_batch_code || '',
          item.planDetailFileName || item.plan_detail_file_name || '',
          item.priority || 'normal',
          item.remarks || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'tech_solutions' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入供应商数据
   * POST /api/sync/suppliers
   */
  async importSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `sup_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM suppliers WHERE id = ? OR supplier_code = ?');
        checkStmt.bind([id, item.supplierCode || item.supplier_code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO suppliers (
            id, supplier_code, supplier_name, contact_person, contact_phone,
            address, supplier_type, mobile_phone, work_phone, fax,
            country, province, city, bank_name, bank_card_number,
            organization, supplier_attribute, area,
            status, remarks, create_by, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.supplierCode || item.supplier_code || '',
          item.supplierName || item.supplier_name || '',
          item.contactPerson || item.contact_person || '',
          item.contactPhone || item.contact_phone || '',
          item.address || '',
          item.supplierType || item.supplier_type || '',
          item.mobilePhone || item.mobile_phone || '',
          item.workPhone || item.work_phone || '',
          item.fax || '',
          item.country || '',
          item.province || '',
          item.city || '',
          item.bankName || item.bank_name || '',
          item.bankCardNumber || item.bank_card_number || '',
          item.organization || '',
          item.supplierAttribute || item.supplier_attribute || '',
          item.area || '',
          item.status || 'active',
          item.remarks || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'suppliers' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入字典数据
   * POST /api/sync/dictionaries
   */
  async importDictionaries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `dict_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM dictionaries WHERE id = ?');
        checkStmt.bind([id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO dictionaries (
            id, category_code, dict_code, dict_label, dict_value,
            color, sort_order, is_default, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.categoryCode || item.category_code || '',
          item.dictCode || item.dict_code || '',
          item.dictLabel || item.dict_label || '',
          item.dictValue || item.dict_value || '',
          item.color || '',
          item.sortOrder || item.sort_order || 0,
          item.isDefault || item.is_default || 0,
          item.status || 'active',
          item.createdAt || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'dictionaries' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入农事任务数据
   * POST /api/sync/farm-tasks
   */
  async importFarmTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `ft_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM farm_tasks WHERE id = ? OR task_code = ?');
        checkStmt.bind([id, item.taskCode || item.task_code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO farm_tasks (
            id, task_code, task_title, task_type, task_content,
            assignee_id, assignee_name, greenhouse_id, greenhouse_name, area_name,
            plan_date, plan_time, priority, status, completion_date, completion_note,
            batch_id, batch_code, create_by, create_time, update_time,
            crop, description, type_name, title, source_type, source_id,
            progress, assigner_id, assigner_name, due_date, accepted_at, completed_at,
            rework_count, version, dispatch_mode, feedback_requirements, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.taskCode || item.task_code || '',
          item.taskTitle || item.task_title || '',
          item.taskType || item.task_type || '',
          item.taskContent || item.task_content || '',
          item.assigneeId || item.assignee_id || '',
          item.assigneeName || item.assignee_name || '',
          item.greenhouseId || item.greenhouse_id || '',
          item.greenhouseName || item.greenhouse_name || '',
          item.areaName || item.area_name || '',
          item.planDate || item.plan_date || '',
          item.planTime || item.plan_time || '',
          item.priority || 'medium',
          item.status || 'pending',
          item.completionDate || item.completion_date || '',
          item.completionNote || item.completion_note || '',
          item.batchId || item.batch_id || '',
          item.batchCode || item.batch_code || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now,
          item.crop || '',
          item.description || '',
          item.typeName || item.type_name || '',
          item.title || '',
          item.sourceType || item.source_type || '',
          item.sourceId || item.source_id || '',
          item.progress || 0,
          item.assignerId || item.assigner_id || '',
          item.assignerName || item.assigner_name || '',
          item.dueDate || item.due_date || '',
          item.acceptedAt || item.accepted_at || '',
          item.completedAt || item.completed_at || '',
          item.reworkCount || item.rework_count || 0,
          item.version || 1,
          item.dispatchMode || item.dispatch_mode || '',
          item.feedbackRequirements || item.feedback_requirements || '',
          item.remarks || ''
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'farm_tasks' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入临时任务数据
   * POST /api/sync/temp-tasks
   */
  async importTempTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `tt_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM temp_tasks WHERE id = ? OR task_code = ?');
        checkStmt.bind([id, item.taskCode || item.task_code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO temp_tasks (
            id, task_code, task_title, task_type, task_content,
            requester_id, requester_name, assignee_id, assignee_name,
            greenhouse_id, greenhouse_name, area_name,
            request_date, request_time, priority, status, due_date,
            completion_date, completion_note, remarks,
            create_by, create_time, update_time,
            estimated_hours, worker_count, actual_hours, progress,
            reject_count, urgency, estimated_days, reject_reason,
            acceptance_remarks, operation_records
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.taskCode || item.task_code || '',
          item.taskTitle || item.task_title || item.title || '',
          item.taskType || item.task_type || '',
          item.taskContent || item.task_content || '',
          item.requesterId || item.requester_id || '',
          item.requesterName || item.requester_name || '',
          item.assigneeId || item.assignee_id || '',
          item.assigneeName || item.assignee_name || '',
          item.greenhouseId || item.greenhouse_id || '',
          item.greenhouseName || item.greenhouse_name || '',
          item.areaName || item.area_name || '',
          item.requestDate || item.request_date || '',
          item.requestTime || item.request_time || '',
          item.priority || 'medium',
          item.status || 'pending',
          item.dueDate || item.due_date || '',
          item.completionDate || item.completion_date || '',
          item.completionNote || item.completion_note || '',
          item.remarks || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now,
          item.estimatedHours || item.estimated_hours || 0,
          item.workerCount || item.worker_count || 1,
          item.actualHours || item.actual_hours || 0,
          item.progress || 0,
          item.rejectCount || item.reject_count || 0,
          item.urgency || 'normal',
          item.estimatedDays || item.estimated_days || 0,
          item.rejectReason || item.reject_reason || '',
          item.acceptanceRemarks || item.acceptance_remarks || '',
          item.operationRecords || item.operation_records || ''
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'temp_tasks' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入巡检记录数据
   * POST /api/sync/inspections
   */
  async importInspections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `insp_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM inspections WHERE id = ? OR record_code = ?');
        checkStmt.bind([id, item.recordCode || item.record_code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO inspections (
            id, record_code, inspection_type, inspector_id, inspector_name,
            greenhouse_name, check_date, check_time, check_result,
            issue_severity, issue_text, images, status, greenhouse_id,
            create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.recordCode || item.record_code || '',
          item.inspectionType || item.inspection_type || '',
          item.inspectorId || item.inspector_id || '',
          item.inspectorName || item.inspector_name || '',
          item.greenhouseName || item.greenhouse_name || '',
          item.checkDate || item.check_date || '',
          item.checkTime || item.check_time || '',
          item.checkResult || item.check_result || '',
          item.issueSeverity || item.issue_severity || '',
          item.issueText || item.issue_text || '',
          Array.isArray(item.images) ? JSON.stringify(item.images) : (item.images || '[]'),
          item.status || 'pending',
          item.greenhouseId || item.greenhouse_id || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'inspections' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入问题记录数据
   * POST /api/sync/problems
   */
  async importProblems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `prob_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM problems WHERE id = ? OR problem_code = ?');
        checkStmt.bind([id, item.problemCode || item.problem_code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO problems (
            id, problem_code, problem_type, title, description,
            greenhouse_name, reporter_id, reporter_name, assignee_id, assignee_name,
            priority, status, create_time, update_time,
            crop_name, inspector_id, inspector_name, check_date, check_time,
            weather, temperature, humidity, crop_status, plant_height, leaf_count,
            handler, handle_date, handle_result, source_task_id, flow_records,
            rework_count, accepted_by, accepted_time, rejected_by, rejected_reason, rejected_time,
            completion_time, expected_completion, remarks, images, source_module, source_id, source_detail
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.problemCode || item.problem_code || '',
          item.problemType || item.problem_type || '',
          item.title || '',
          item.description || '',
          item.greenhouseName || item.greenhouse_name || '',
          item.reporterId || item.reporter_id || '',
          item.reporterName || item.reporter_name || '',
          item.assigneeId || item.assignee_id || '',
          item.assigneeName || item.assignee_name || '',
          item.priority || 'medium',
          item.status || 'pending',
          item.createTime || item.create_time || now,
          now,
          item.cropName || '',
          item.inspectorId || '',
          item.inspectorName || '',
          item.checkDate || '',
          item.checkTime || '',
          item.weather || '',
          item.temperature || 0,
          item.humidity || 0,
          item.cropStatus || '',
          item.plantHeight || 0,
          item.leafCount || 0,
          item.handler || '',
          item.handleDate || '',
          item.handleResult || '',
          item.sourceTaskId || '',
          item.flowRecords || '[]',
          item.reworkCount || 0,
          item.acceptedBy || '',
          item.acceptedTime || '',
          item.rejectedBy || '',
          item.rejectedReason || '',
          item.rejectedTime || '',
          item.completionTime || '',
          item.expectedCompletion || '',
          item.remarks || '',
          item.images || '[]',
          item.sourceModule || '',
          item.sourceId || '',
          item.sourceDetail || ''
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'problems' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入考勤数据
   * POST /api/sync/attendance
   */
  async importAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `att_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM attendance_records WHERE id = ? OR (worker_id = ? AND date = ?)');
        checkStmt.bind([id, item.workerId || item.worker_id || '', item.date || '']);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO attendance_records (
            id, worker_id, name, dept, date, check_in, check_out,
            hours, status, status_class, task_id, batch_id, remarks,
            version, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.workerId || item.worker_id || '',
          item.name || '',
          item.dept || '',
          item.date || '',
          item.checkIn || item.check_in || '',
          item.checkOut || item.check_out || '',
          item.hours || 0,
          item.status || '正常',
          item.statusClass || item.status_class || 'normal',
          item.taskId || item.task_id || '',
          item.batchId || item.batch_id || '',
          item.remarks || '',
          item.version || 1,
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'attendance_records' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入工作日志数据
   * POST /api/sync/labor
   */
  async importLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `lab_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM labor_records WHERE id = ?');
        checkStmt.bind([id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO labor_records (
            id, worker_id, worker_name, work_type, work_date,
            work_hours, hourly_rate, total_amount,
            greenhouse_id, greenhouse_name, area_name,
            task_description, batch_id, batch_code,
            status, remarks, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.worker || item.workerName || item.worker_id || '',
          item.worker || item.workerName || item.worker_name || '',  // worker_name
          item.taskType || item.task_type || item.type || '',        // work_type
          item.date || item.workDate || item.work_date || '',         // work_date
          item.workloadHours || item.workHours || item.work_hours || 0,  // work_hours
          item.hourlyRate || item.hourly_rate || 0,                    // hourly_rate
          item.totalAmount || item.total_amount || 0,                  // total_amount
          item.greenhouseId || item.greenhouse_id || '',               // greenhouse_id
          item.greenhouse || item.greenhouseName || item.greenhouse_name || '',  // greenhouse_name
          item.areaName || item.area_name || '',                      // area_name
          item.tasks || item.taskDescription || item.task_description || '',  // task_description
          item.batchId || item.batch_id || '',                         // batch_id
          item.batchCode || item.batch_code || '',                     // batch_code
          item.status || 'pending',
          item.remarks || item.feedbackText || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'labor_records' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入生产计划数据
   * POST /api/sync/production-plans
   */
  async importProductionPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `pp_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM production_plans WHERE id = ? OR plan_code = ?');
        checkStmt.bind([id, item.planCode || item.plan_code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO production_plans (
            id, plan_code, plan_name, plan_type, crop_name, crop_variety,
            greenhouse_name, area_name, planned_quantity, actual_quantity,
            planting_date, expected_harvest_date, actual_harvest_date,
            status, priority, remarks, create_by, create_time, update_time,
            responsible_person, unit, publish_date, batch_status,
            plan_detail, plan_detail_file_name, planting_area, planting_mode,
            supplier_name, seedling_site_name, seed_quantity, target_seedling_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.planCode || item.plan_code || '',
          item.planName || item.plan_name || '',
          item.planType || item.plan_type || '',
          item.cropName || item.crop_name || '',
          item.cropVariety || item.crop_variety || '',
          item.greenhouseName || item.greenhouse_name || '',
          item.areaName || item.area_name || '',
          item.plannedQuantity || item.planned_quantity || 0,
          item.actualQuantity || item.actual_quantity || 0,
          item.plantingDate || item.planting_date || '',
          item.expectedHarvestDate || item.expected_harvest_date || '',
          item.actualHarvestDate || item.actual_harvest_date || '',
          item.status || 'planning',
          item.priority || 'normal',
          item.remarks || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          item.updateTime || item.update_time || now,
          item.responsiblePerson || item.responsible_person || '',
          item.unit || '',
          item.publishDate || item.publish_date || '',
          item.batchStatus || item.batch_status || 'draft',
          item.planDetail || item.plan_detail || '',
          item.planDetailFileName || item.plan_detail_file_name || '',
          item.plantingArea || item.planting_area || 0,
          item.plantingMode || item.planting_mode || '',
          item.supplierName || item.supplier_name || '',
          item.seedlingSiteName || item.seedling_site_name || '',
          item.seedQuantity || item.seed_quantity || 0,
          item.targetSeedlingCount || item.target_seedling_count || 0
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'production_plans' }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量导入采购计划数据
   * POST /api/sync/purchase-plans
   */
  async importPurchasePlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        res.status(400).json({ success: false, error: 'data 必须是数组' });
        return;
      }

      const db = getDatabase();
      const now = new Date().toISOString();
      let insertedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const id = item.id || `pup_${Date.now()}_${insertedCount}`;

        // 检查是否已存在
        const checkStmt = db.prepare('SELECT id FROM purchase_plans WHERE id = ? OR plan_code = ?');
        checkStmt.bind([id, item.planCode || item.plan_code || item.id]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          skippedCount++;
          continue;
        }

        const stmt = db.prepare(`
          INSERT INTO purchase_plans (
            id, plan_code, plan_title, plan_type, department_id, department_name,
            applicant_id, applicant_name, apply_date, expected_date,
            supplier_id, supplier_name, total_amount, priority, status,
            approval_status, remarks, attachments, items, related_batch_code,
            approval_person, create_by, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.bind([
          id,
          item.planCode || item.plan_code || '',
          item.planTitle || item.plan_title || '',
          item.planType || item.plan_type || '',
          item.departmentId || item.department_id || '',
          item.departmentName || item.department_name || '',
          item.applicantId || item.applicant_id || '',
          item.applicantName || item.applicant_name || '',
          item.applyDate || item.apply_date || '',
          item.expectedDate || item.expected_date || '',
          item.supplierId || item.supplier_id || '',
          item.supplierName || item.supplier_name || '',
          item.totalAmount || item.total_amount || 0,
          item.priority || 'medium',
          item.status || 'draft',
          item.approvalStatus || item.approval_status || 'pending',
          item.remarks || '',
          item.attachments || '[]',
          item.items || '[]',
          item.relatedBatchCode || item.related_batch_code || '',
          item.approvalPerson || item.approval_person || '',
          item.createBy || item.create_by || '',
          item.createTime || item.create_time || now,
          now
        ]);
        stmt.step();
        stmt.free();
        insertedCount++;
      }

      saveDatabase();

      res.json({
        success: true,
        data: { imported: insertedCount, skipped: skippedCount, table: 'purchase_plans' }
      });
    } catch (error) {
      next(error);
    }
  }
}

// 导出单例
export const syncController = new SyncController();
