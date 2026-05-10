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
      db.run('DELETE FROM seed_sources');

      const now = new Date().toISOString();
      let insertedCount = 0;

      for (const item of data) {
        const id = item.id || `SS${Date.now()}_${insertedCount}`;
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
        data: { imported: insertedCount, table: 'seed_sources' }
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
      db.run('DELETE FROM seedlings');

      const now = new Date().toISOString();
      let insertedCount = 0;

      for (const item of data) {
        const id = item.id || `SD${Date.now()}_${insertedCount}`;
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
        data: { imported: insertedCount, table: 'seedlings' }
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
      db.run('DELETE FROM plantings');

      const now = new Date().toISOString();
      let insertedCount = 0;

      for (const item of data) {
        const id = item.id || `PL${Date.now()}_${insertedCount}`;
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
        data: { imported: insertedCount, table: 'plantings' }
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
      db.run('DELETE FROM harvest_records');

      const now = new Date().toISOString();
      let insertedCount = 0;

      for (const item of data) {
        const id = item.id || `HR${Date.now()}_${insertedCount}`;
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
        data: { imported: insertedCount, table: 'harvest_records' }
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
      db.run('DELETE FROM crop_instances');

      const now = new Date().toISOString();
      let insertedCount = 0;

      for (const item of data) {
        const id = item.id || `CI${Date.now()}_${insertedCount}`;
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
        data: { imported: insertedCount, table: 'crop_instances' }
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
}

// 导出单例
export const syncController = new SyncController();
