/**
 * 种源数据访问层 (Repository)
 * 负责所有数据库 SQL 操作
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { SeedSourceRecord, SeedSourceQuery } from '../types/seedSource';

/**
 * 种源表允许更新的列白名单（C10：防止任意字段被写入 DB）
 * 调用方传入的 key 必须命中此白名单，否则抛出错误。
 */
const ALLOWED_UPDATE_COLUMNS = new Set<string>([
  'source_code',
  'source_name',
  'source_type',
  'source_origin',
  'production_plan_code',
  'crop_category',
  'type_name',
  'variety_name',
  'crop_name',
  'crop_variety',
  'crop_code',
  'supplier_id',
  'supplier_name',
  'quantity',
  'unit',
  'purchase_date',
  'purchase_price',
  'total_amount',
  'used_quantity',
  'remaining_quantity',
  'remarks',
  'pictures',
  'propagation_type',
  'propagation_status',
  'propagation_method',
  'parent_male_id',
  'parent_male_code',
  'parent_female_id',
  'parent_female_code',
  'mother_plant_id',
  'mother_plant_code',
  'linked_planting_id',
  'linked_planting_code',
  'propagation_start_date',
  'expected_harvest_date',
  'actual_harvest_date',
  'breeding_location',
  'target_traits',
  'generation',
  'end_type',
  'end_time',
  'print_count',
]);

/**
 * 种源 Repository 类
 * 提供种源数据的增删改查操作
 */
export class SeedSourceRepository {
  /**
   * 查询种源列表（分页、筛选）
   * @param query 查询条件
   * @returns 种源数据列表和总数
   */
  async findAll(query: SeedSourceQuery): Promise<{ data: SeedSourceRecord[]; total: number }> {
    const db = getDatabase();
    const { crop_name, status, page = 1, limit = 50 } = query;

    // 使用 SQL 别名将数据库字段映射到前端期望的字段名
    // 通过 LEFT JOIN 获取 crop_varieties 表的详细信息
    let baseSql = `SELECT
      ss.id,
      ss.source_code AS seedCode,
      ss.source_name AS sourceName,
      ss.source_type AS sourceType,
      COALESCE(ss.source_origin, 'external_purchase') AS sourceOrigin,
      COALESCE(cv.category_name, ss.crop_category, '') AS cropCategory,
      COALESCE(cv.type_name, ss.type_name, '') AS typeName,
      -- 2026-06-06: R5 — COALESCE 顺序调整：ss.crop_variety 优先于 ss.variety_name
      -- 旧顺序：cv.sub_variety1_name, cv.variety_name, ss.variety_name, ss.crop_variety, ''
      -- 新顺序：cv.sub_variety1_name, cv.variety_name, ss.crop_variety, ss.variety_name, ''
      -- 原因：老数据只有 ss.variety_name；新数据写入 ss.crop_variety；新字段应优先被采用
      COALESCE(cv.sub_variety1_name, cv.variety_name, ss.crop_variety, ss.variety_name, '') AS varietyName,
      ss.crop_name AS cropName,
      COALESCE(ss.crop_variety, '') AS cropVariety,
      COALESCE(cv.crop_code, ss.crop_code, '') AS cropCode,
      ss.supplier_id AS supplierId,
      ss.supplier_name AS supplierName,
      ss.purchase_date AS purchaseDate,
      ss.quantity,
      ss.unit,
      ss.purchase_price AS unitPrice,
      ss.total_amount AS totalAmount,
      ss.remaining_quantity AS availableCount,
      ss.quantity AS initialCount,
      COALESCE(ss.pictures, '[]') AS pictures,
      ss.used_quantity AS usedQuantity,
      ss.remaining_quantity,
      -- ss.status 2026-06-04 改为实时计算：status 由 availableCount/initialCount 派生，不再 DB 存储
      ss.remarks,
      ss.production_plan_code AS productionPlanCode,
      -- 2026-06-05: 强结分支字段（与 fixMissingSchema ALTER TABLE 同步）
      ss.end_type AS endType,
      ss.end_time AS endTime,
      COALESCE(ss.print_count, 0) AS printCount,
      ss.create_by AS createBy,
      ss.create_time AS createTime,
      ss.update_time AS updateTime,
      ss.propagation_type AS propagationType,
      ss.propagation_status AS propagationStatus,
      ss.propagation_method AS propagationMethod,
      ss.parent_male_id AS parentMaleId,
      ss.parent_male_code AS parentMaleCode,
      ss.parent_female_id AS parentFemaleId,
      ss.parent_female_code AS parentFemaleCode,
      ss.mother_plant_id AS motherPlantId,
      ss.mother_plant_code AS motherPlantCode,
      ss.linked_planting_id AS linkedPlantingId,
      ss.linked_planting_code AS linkedPlantingCode,
      ss.propagation_start_date AS propagationStartDate,
      ss.expected_harvest_date AS expectedHarvestDate,
      ss.actual_harvest_date AS actualHarvestDate,
      ss.breeding_location AS breedingLocation,
      ss.target_traits AS targetTraits,
      ss.generation
    FROM seed_sources ss
    LEFT JOIN crop_varieties cv
      ON ss.crop_code = cv.crop_code
    WHERE 1=1`;

    const params: any[] = [];

    if (crop_name) {
      baseSql += ' AND ss.crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    // status 过滤已废弃（2026-06-04 改实时计算）

    // Count 查询
    let countSql = `SELECT COUNT(*) as total FROM seed_sources ss LEFT JOIN crop_varieties cv ON ss.crop_code = cv.crop_code WHERE 1=1`;
    const countParams: any[] = [];

    if (crop_name) {
      countSql += ' AND ss.crop_name LIKE ?';
      countParams.push(`%${crop_name}%`);
    }
    // status 过滤已废弃：2026-06-04 status 改为前端实时计算，后端不再支持 status 过滤

    baseSql += ' ORDER BY ss.create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, countParams);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    baseSql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects<SeedSourceRecord>(db, baseSql, params);

    return { data: items, total };
  }

  /**
   * 根据ID查询种源详情
   * @param id 种源ID
   * @returns 种源记录或 undefined
   */
  async findById(id: string): Promise<SeedSourceRecord | undefined> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seed_sources WHERE id = ?');
    stmt.bind([id]);

    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return undefined;
    }

    // 先转换为 unknown 再转换为目标类型
    return item as unknown as SeedSourceRecord;
  }

  /**
   * 创建种源记录
   * @param data 种源数据
   * @returns 创建的种源记录
   */
  async create(data: Partial<SeedSourceRecord>): Promise<SeedSourceRecord> {
    const db = getDatabase();
    const newId = data.id || `SS${Date.now()}`;
    const now = new Date().toISOString();

    // 使用 any[] 来避免 sql.js 类型严格检查问题
    const params: any[] = [
      newId,
      data.source_code || '',
      data.source_name || '',
      data.source_type || '',
      data.source_origin || 'external_purchase',
      data.production_plan_code || '',
      data.crop_category || '',
      data.type_name || '',
      data.variety_name || '',
      data.crop_name || '',
      data.crop_variety || '',
      data.crop_code || '',
      data.supplier_id || '',
      data.supplier_name || '',
      data.quantity || 0,
      data.unit || '',
      data.purchase_date || '',
      data.purchase_price || 0,
      data.total_amount || 0,
      data.used_quantity || 0,
      data.remaining_quantity || data.quantity || 0,
      // 2026-06-04: status 不再写入 DB，由前端 computeStockStatus(availableCount, initialCount) 实时计算
      data.remarks || '',
      data.create_by || '',
      data.create_by_id || '',
      // 2026-06-05: 修复繁殖字段缺失（与 list SQL/前端 service 同步）
      data.propagation_type || 'external',
      data.propagation_status || null,
      data.propagation_method || '',
      data.parent_male_id || '',
      data.parent_male_code || '',
      data.parent_female_id || '',
      data.parent_female_code || '',
      data.mother_plant_id || '',
      data.mother_plant_code || '',
      data.linked_planting_id || '',
      data.linked_planting_code || '',
      data.propagation_start_date || '',
      data.expected_harvest_date || '',
      data.actual_harvest_date || '',
      data.breeding_location || '',
      data.target_traits || '',
      data.generation || '',
      now,
      now
    ];

    db.run(`
      INSERT INTO seed_sources (id, source_code, source_name, source_type, source_origin,
        production_plan_code, crop_category, type_name, variety_name, crop_name, crop_variety, crop_code,
        supplier_id, supplier_name, quantity, unit, purchase_date, purchase_price,
        total_amount, used_quantity, remaining_quantity, remarks, create_by, create_by_id,
        propagation_type, propagation_status, propagation_method,
        parent_male_id, parent_male_code, parent_female_id, parent_female_code,
        mother_plant_id, mother_plant_code, linked_planting_id, linked_planting_code,
        propagation_start_date, expected_harvest_date, actual_harvest_date,
        breeding_location, target_traits, generation,
        create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);

    // P0 #1: 单独 UPDATE pictures 列（避免破坏既有 INSERT 字段顺序）
    if (data.pictures !== undefined) {
      const picturesJson = typeof data.pictures === 'string'
        ? data.pictures
        : JSON.stringify(data.pictures || []);
      db.run(`UPDATE seed_sources SET pictures = ? WHERE id = ?`, [picturesJson, newId]);
    }

    saveDatabase();

    return { ...data, id: newId, create_time: now, update_time: now } as SeedSourceRecord;
  }

  /**
   * 更新种源记录
   * @param id 种源ID
   * @param data 更新数据
   * @returns 更新后的种源记录
   */
  async update(id: string, data: Partial<SeedSourceRecord>): Promise<SeedSourceRecord> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // C10：白名单过滤，防止调用方传任意字段写入 DB
    const keys = Object.keys(data).filter(k => k !== 'id');
    const invalidKeys = keys.filter(k => !ALLOWED_UPDATE_COLUMNS.has(k));
    if (invalidKeys.length > 0) {
      throw new Error(`不允许更新的字段: ${invalidKeys.join(', ')}`);
    }

    const fields = keys.map(k => `${k} = ?`).join(', ');

    if (fields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    // 使用 any[] 来避免 sql.js 类型严格检查问题
    const values: any[] = keys.map(k => data[k as keyof SeedSourceRecord]);
    values.push(now, id);

    db.run(`UPDATE seed_sources SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();

    // 返回更新后的记录
    return this.findById(id) as Promise<SeedSourceRecord>;
  }

  /**
   * 删除种源记录
   * @param id 种源ID
   */
  async delete(id: string): Promise<void> {
    const db = getDatabase();
    db.run('DELETE FROM seed_sources WHERE id = ?', [id]);
    saveDatabase();
  }

  /**
   * 批量删除种源记录
   * @param ids 种源ID数组
   * @returns 删除数量
   */
  async deleteBatch(ids: string[]): Promise<number> {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM seed_sources WHERE id IN (${placeholders})`, ids);
    saveDatabase();
    return ids.length;
  }

  /**
   * 获取当日最大序号
   * @param dateStr 日期字符串 (YYYYMMDD)
   * @returns 当日最大序号，如果没有则返回 0
   */
  async getTodayMaxSerial(dateStr: string): Promise<number> {
    const db = getDatabase();
    // 匹配格式: ZZ + 日期 + - + 序号 (如 ZZ20260513-001)
    const pattern = `ZZ${dateStr}-___`;
    const stmt = db.prepare(`
      SELECT source_code FROM seed_sources
      WHERE source_code LIKE ? AND LENGTH(source_code) = 16
      ORDER BY source_code DESC LIMIT 1
    `);
    stmt.bind([pattern]);

    let maxSerial = 0;
    if (stmt.step()) {
      const row = stmt.getAsObject() as { source_code: string };
      const code = row.source_code;
      // 提取序号部分 (最后3位)
      const serialStr = code.slice(-3);
      maxSerial = parseInt(serialStr, 10) || 0;
    }
    stmt.free();
    return maxSerial;
  }

  // ========== 繁殖过程记录操作 ==========

  /**
   * 添加繁殖过程记录
   */
  async addPropagationRecord(data: any): Promise<any> {
    const db = getDatabase();
    const id = `PR${Date.now()}`;
    const now = new Date().toISOString();

    const params = [
      id,
      data.seed_source_id || '',
      data.record_date || '',
      data.stage || '',
      data.temperature ?? null,
      data.humidity ?? null,
      data.abnormality || null,
      data.operator || null,
      data.remarks || null,
      JSON.stringify(data.pictures || []),
      data.pollination_type || null,
      data.pollinator_crop || null,
      data.flower_count || 0,
      data.fruit_set_count || 0,
      data.harvest_seed_count || 0,
      data.seed_weight || 0,
      data.harvest_plant_count || 0,
      data.germination_rate || 0,
      data.purity || 0,
      data.moisture || 0,
      data.survival_rate || 0,
      data.rooted_rate || 0,
      data.graft_success_rate || 0,
      now,
      now,
    ] as any[];

    db.run(`
      INSERT INTO propagation_records
      (id, seed_source_id, record_date, stage,
       temperature, humidity, abnormality, operator, remarks, pictures,
       pollination_type, pollinator_crop, flower_count, fruit_set_count,
       harvest_seed_count, seed_weight, harvest_plant_count,
       germination_rate, purity, moisture,
       survival_rate, rooted_rate, graft_success_rate,
       create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);

    saveDatabase();
    return { ...data, id, create_time: now, update_time: now };
  }

  /**
   * 获取繁殖过程记录列表
   */
  async getPropagationRecords(seedSourceId: string): Promise<any[]> {
    const db = getDatabase();
    const result = db.exec(
      'SELECT * FROM propagation_records WHERE seed_source_id = ? ORDER BY record_date DESC, create_time DESC',
      [seedSourceId]
    );

    if (!result || result.length === 0) return [];

    const { columns, values } = result[0];
    const records: any[] = [];
    for (const row of values) {
      const record: any = {};
      columns.forEach((col: string, i: number) => {
        record[col] = row[i];
      });
      // 解析 pictures JSON 字符串
      if (typeof record.pictures === 'string') {
        try { record.pictures = JSON.parse(record.pictures); } catch (e) { record.pictures = []; }
      } else {
        record.pictures = [];
      }
      records.push(record);
    }
    return records;
  }

  /**
   * 全量查询繁殖过程记录（JOIN seed_sources，支持筛选+分页）
   * 用于"繁殖过程记录"全量查看页
   */
  async findAllPropagationRecords(filters: {
    seedSourceId?: string;
    stage?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number }> {
    const db = getDatabase();
    const { seedSourceId, stage, startDate, endDate } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;

    let baseSql = `
      SELECT
        pr.id, pr.seed_source_id AS seedSourceId, pr.record_date AS recordDate, pr.stage,
        pr.temperature, pr.humidity, pr.abnormality, pr.operator, pr.remarks,
        pr.pollination_type AS pollinationType, pr.pollinator_crop AS pollinatorCrop,
        pr.flower_count AS flowerCount, pr.fruit_set_count AS fruitSetCount,
        pr.harvest_seed_count AS harvestSeedCount, pr.seed_weight AS seedWeight,
        pr.harvest_plant_count AS harvestPlantCount,
        pr.germination_rate AS germinationRate, pr.purity, pr.moisture,
        pr.survival_rate AS survivalRate, pr.rooted_rate AS rootedRate,
        pr.graft_success_rate AS graftSuccessRate,
        pr.create_time AS createTime, pr.update_time AS updateTime,
        ss.source_code AS seedCode,
        ss.crop_name AS cropName,
        ss.crop_variety AS cropVariety,
        ss.propagation_type AS propagationType
      FROM propagation_records pr
      LEFT JOIN seed_sources ss ON pr.seed_source_id = ss.id
      WHERE 1=1`;

    const params: any[] = [];

    if (seedSourceId) {
      baseSql += ' AND pr.seed_source_id = ?';
      params.push(seedSourceId);
    }
    if (stage) {
      baseSql += ' AND pr.stage = ?';
      params.push(stage);
    }
    if (startDate) {
      baseSql += ' AND pr.record_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      baseSql += ' AND pr.record_date <= ?';
      params.push(endDate);
    }

    let countSql = `SELECT COUNT(*) AS total FROM propagation_records pr WHERE 1=1`;
    const countParams: any[] = [];
    if (seedSourceId) {
      countSql += ' AND pr.seed_source_id = ?';
      countParams.push(seedSourceId);
    }
    if (stage) {
      countSql += ' AND pr.stage = ?';
      countParams.push(stage);
    }
    if (startDate) {
      countSql += ' AND pr.record_date >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countSql += ' AND pr.record_date <= ?';
      countParams.push(endDate);
    }

    baseSql += ' ORDER BY pr.record_date DESC, pr.create_time DESC';

    const total = execCount(db, countSql, countParams);
    const offset = (page - 1) * limit;
    baseSql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = db.exec(baseSql, params);
    if (!result || result.length === 0) return { items: [], total };

    const { columns, values } = result[0];
    const items: any[] = [];
    for (const row of values) {
      const rec: any = {};
      columns.forEach((col: string, i: number) => {
        rec[col] = row[i];
      });
      items.push(rec);
    }
    return { items, total };
  }

  /**
   * 推进繁殖阶段
   */
  async updatePropagationStage(id: string, newStage: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.run(
      'UPDATE seed_sources SET propagation_status = ?, update_time = ? WHERE id = ?',
      [newStage, now, id]
    );
    saveDatabase();
  }

  /**
   * 完成繁殖入库 - 更新库存数量和状态
   */
  async completePropagation(id: string, quantity: number): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 获取当前记录
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('种源记录不存在');
    }

    const newAvailable = (existing.remaining_quantity || 0) + quantity;
    const newInitial = (existing.quantity || 0) + quantity;

    db.run(
      `UPDATE seed_sources SET
        propagation_status = 'completed',
        -- status = 'sufficient' 已废弃（2026-06-04 改实时计算）
        quantity = ?,
        remaining_quantity = ?,
        actual_harvest_date = ?,
        update_time = ?
      WHERE id = ?`,
      [newInitial, newAvailable, now, now, id]
    );
    saveDatabase();
  }

  /**
   * 检查种源是否可删除（C8：下沉到 repository，补全所有引用方）
   * 引用方：
   *   1. seedlings.source_id
   *   2. propagation_records.seed_source_id
   *   3. seed_source_print_records.seed_source_id
   *   4. plantings.linked_planting_id（反查种源表 id 字段）
   * @param id 种源ID
   * @returns { deletable, references }
   */
  async checkDeletable(id: string): Promise<{
    deletable: boolean;
    references: Array<{
      module: string;
      moduleCode: string;
      id: string;
      code: string;
      cropName?: string;
      cropVariety?: string;
      date?: string;
      status?: string;
    }>;
  }> {
    const db = getDatabase();
    const references: Array<{
      module: string;
      moduleCode: string;
      id: string;
      code: string;
      cropName?: string;
      cropVariety?: string;
      date?: string;
      status?: string;
    }> = [];

    // sql.js db.exec() 不支持参数绑定, 用 db.prepare + bind + step 替代
    const queryRows = (sql: string, idParam: string): any[][] => {
      const stmt = db.prepare(sql);
      stmt.bind([idParam]);
      const rows: any[][] = [];
      while (stmt.step()) {
        rows.push(stmt.get());
      }
      stmt.free();
      return rows;
    };

    db.exec('BEGIN');
    try {
      // 引用方1：育苗记录（seedlings.source_id）
      for (const row of queryRows(
        `SELECT id, seedling_code, crop_name, crop_variety, seedling_date, status
         FROM seedlings WHERE source_id = ? ORDER BY create_time DESC`, id)) {
        references.push({
          module: '育苗管理', moduleCode: 'seedling',
          id: row[0] as string, code: row[1] as string,
          cropName: row[2] as string, cropVariety: row[3] as string,
          date: row[4] as string, status: row[5] as string,
        });
      }

      // 引用方2：繁殖过程记录（propagation_records.seed_source_id）
      for (const row of queryRows(
        `SELECT id, stage, record_date, operator
         FROM propagation_records WHERE seed_source_id = ?
         ORDER BY record_date DESC LIMIT 100`, id)) {
        references.push({
          module: '繁殖过程记录', moduleCode: 'propagation_record',
          id: row[0] as string, code: row[0] as string,
          date: row[2] as string, status: row[1] as string,
          cropName: row[3] as string,
        });
      }

      // 引用方3：打印记录（seed_source_print_records.seed_source_id）
      for (const row of queryRows(
        `SELECT id, print_type, print_time, print_count
         FROM seed_source_print_records WHERE seed_source_id = ?
         ORDER BY print_time DESC LIMIT 100`, id)) {
        references.push({
          module: '种源打印记录', moduleCode: 'seed_source_print',
          id: row[0] as string, code: row[0] as string,
          date: row[2] as string, status: row[1] as string,
        });
      }

      // 引用方4：种植记录（plantings.source_id, V2 种植直接用种源）
      for (const row of queryRows(
        `SELECT id, planting_code, crop_name, crop_variety, planting_date, status
         FROM plantings WHERE source_id = ?
         ORDER BY update_time DESC LIMIT 100`, id)) {
        references.push({
          module: '种植管理', moduleCode: 'planting',
          id: row[0] as string, code: row[1] as string,
          cropName: row[2] as string, cropVariety: row[3] as string,
          date: row[4] as string, status: row[5] as string,
        });
      }

      // 引用方5：回流记录（V2 crop_circulation_records.parent_source_id）
      for (const row of queryRows(
        `SELECT id, circulation_type, circulation_date, is_revoked
         FROM crop_circulation_records WHERE parent_source_id = ? AND is_revoked = 0
         ORDER BY created_at DESC LIMIT 100`, id)) {
        references.push({
          module: '回流记录(父种源)', moduleCode: 'circulation',
          id: row[0] as string, code: row[0] as string,
          date: row[2] as string,
          status: `${row[1] || ''} ${row[3] ? '(有效)' : ''}`,
        });
      }

      // 引用方6：回流记录（V2 crop_circulation_records.new_source_id）
      for (const row of queryRows(
        `SELECT id, circulation_type, circulation_date, is_revoked
         FROM crop_circulation_records WHERE new_source_id = ? AND is_revoked = 0
         ORDER BY created_at DESC LIMIT 100`, id)) {
        references.push({
          module: '回流记录(子种源)', moduleCode: 'circulation',
          id: row[0] as string, code: row[0] as string,
          date: row[2] as string,
          status: `${row[1] || ''} ${row[3] ? '(有效)' : ''}`,
        });
      }

      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch { /* ROLLBACK 失败不掩盖原始错误 */ }
      throw err;
    }

    return {
      deletable: references.length === 0,
      references,
    };
  }

  /**
   * 获取可用于留种的种植记录
   */
  async getPlantingsForSeedSaving(): Promise<any[]> {
    const db = getDatabase();
    const result = db.exec(`
      SELECT * FROM plantings
      WHERE status = 'harvested'
      ORDER BY update_time DESC
    `);

    if (!result || result.length === 0) return [];

    const { columns, values } = result[0];
    return values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
      return obj;
    });
  }
}

// 导出单例
export const seedSourceRepository = new SeedSourceRepository();
