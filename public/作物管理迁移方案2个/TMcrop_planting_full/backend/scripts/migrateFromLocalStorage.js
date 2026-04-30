/**
 * LocalStorage JSON 迁移脚本
 * 用法: node scripts/migrateFromLocalStorage.js <path-to-exported-json>
 * 格式要求: JSON 文件顶层为 { seedSources, seedlings, plantings, dailyRecords, harvests, cropInstances, cropOrders, cropVarieties, pictures }
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.db');
const JSON_PATH = process.argv[2];

if (!JSON_PATH) {
  console.error('Usage: node scripts/migrateFromLocalStorage.js <export.json>');
  process.exit(1);
}

if (!fs.existsSync(JSON_PATH)) {
  console.error('File not found:', JSON_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

let data;
try {
  data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
} catch (e) {
  console.error('Failed to parse JSON:', e.message);
  process.exit(1);
}

function iso(d) {
  if (!d) return null;
  if (typeof d === 'string' && d.includes('T')) return d;
  // 中文日期格式 2026-01-15 10:00:00 -> ISO
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toISOString();
  } catch { return d; }
}

const stats = { seedSources: 0, seedlings: 0, plantings: 0, dailyRecords: 0, harvests: 0, cropInstances: 0, cropOrders: 0, cropVarieties: 0, pictures: 0 };

const insert = db.transaction(() => {
  // seed_sources
  if (Array.isArray(data.seedSources)) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO seed_sources
      (id, seed_code, source_type, source_origin, crop_category, type_name, variety_name, crop_name, crop_variety, crop_code,
       supplier_id, supplier_name, purchase_date, quantity, unit, unit_price, total_amount, initial_count, available_count,
       pictures, remarks, status, print_count, create_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of data.seedSources) {
      stmt.run(item.id, item.seedCode, item.sourceType, item.sourceOrigin, item.cropCategory,
        item.typeName, item.varietyName, item.cropName, item.cropVariety, item.cropCode,
        item.supplierId, item.supplierName, item.purchaseDate, item.quantity, item.unit,
        item.unitPrice, item.totalAmount, item.initialCount, item.availableCount,
        JSON.stringify(item.pictures || []), item.remarks, item.status, item.printCount,
        item.createBy, iso(item.createTime), iso(item.updateTime));
      stats.seedSources++;
    }
  }

  // seedlings
  if (Array.isArray(data.seedlings)) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO seedlings
      (id, seedling_code, source_id, source_code, crop_name, crop_variety, seedling_type, site_id, site_name,
       start_date, end_date, expected_end_date, initial_count, survival_count, planted_count, survival_rate,
       loss_count, loss_rate, is_finished, status, pictures, quality_grade, print_count, remarks, create_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of data.seedlings) {
      stmt.run(item.id, item.seedlingCode, item.sourceId, item.sourceCode, item.cropName,
        item.cropVariety, item.seedlingType, item.siteId, item.siteName,
        item.startDate, item.endDate, item.expectedEndDate, item.initialCount,
        item.survivalCount, item.plantedCount, item.survivalRate, item.lossCount,
        item.lossRate, item.isFinished ? 1 : 0, item.status,
        JSON.stringify(item.pictures || []), item.qualityGrade, item.printCount,
        item.remarks, item.createBy, iso(item.createTime), iso(item.updateTime));
      stats.seedlings++;
    }
  }

  // plantings
  if (Array.isArray(data.plantings)) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO plantings
      (id, plant_code, source_type, source_id, source_code, crop_name, crop_variety, area_id, area_name, root_name,
       planting_count, planting_date, soil_ph, soil_ec, transplant_count, transplant_date, is_harvest, harvest_date,
       attrition_rate, print_count, traceability_code, pictures, status, remarks, create_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of data.plantings) {
      stmt.run(item.id, item.plantCode, item.sourceType, item.sourceId, item.sourceCode,
        item.cropName, item.cropVariety, item.areaId, item.areaName, item.rootName,
        item.plantingCount, item.plantingDate, item.soilPH, item.soilEC,
        item.transplantCount, item.transplantDate, item.isHarvest ? 1 : 0,
        item.harvestDate, item.attritionRate, item.printCount,
        item.traceabilityCode, JSON.stringify(item.pictures || []), item.status,
        item.remarks, item.createBy, iso(item.createTime), iso(item.updateTime));
      stats.plantings++;
    }
  }

  // daily_records (从 seedlings 中提取)
  if (Array.isArray(data.seedlings)) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO daily_records
      (id, seedling_id, record_date, temperature, humidity, watering, remarks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of data.seedlings) {
      if (Array.isArray(item.dailyRecords)) {
        for (const dr of item.dailyRecords) {
          stmt.run(dr.id, dr.seedlingId || item.id, dr.recordDate, dr.temperature, dr.humidity,
            dr.watering ? 1 : 0, dr.remarks, iso(dr.recordDate), iso(dr.recordDate));
          stats.dailyRecords++;
        }
      }
    }
  }

  // harvests
  if (Array.isArray(data.harvests)) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO harvests
      (id, harvest_code, batch_id, batch_code, crop_name, greenhouse_id, greenhouse_name, harvest_date,
       harvest_area, harvest_quantity, unit, quality, grade, harvester_ids, harvester_names,
       warehouse_id, warehouse_name, status, auditor, variety, planting_mode, target_yield,
       related_task_id, related_task_code, pictures, remarks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of data.harvests) {
      stmt.run(item.id, item.harvestCode, item.batchId, item.batchCode, item.cropName,
        item.greenhouseId, item.greenhouseName, item.harvestDate, item.harvestArea,
        item.harvestQuantity, item.unit, item.quality, item.grade,
        JSON.stringify(item.harvesterIds || []), JSON.stringify(item.harvesterNames || []),
        item.warehouseId, item.warehouseName, item.status, item.auditor,
        item.variety, item.plantingMode, item.targetYield,
        item.relatedTaskId, item.relatedTaskCode, JSON.stringify(item.pictures || []),
        item.remarks, iso(item.createdAt || item.createTime), iso(item.updatedAt || item.createTime));
      stats.harvests++;
    }
  }

  // crop_instances
  if (Array.isArray(data.cropInstances)) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO crop_instances
      (id, instance_code, order_id, order_code, crop_category, crop_name, crop_variety, category_code, type_code, sub_code,
       source_origin, source_description, initial_quantity, current_quantity, planted_quantity, harvested_quantity, status,
       seed_entry_date, seedling_start_date, planting_date, harvest_date, source_instance_id, create_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of data.cropInstances) {
      stmt.run(item.id, item.instanceCode, item.orderId, item.orderCode,
        item.cropCategory, item.cropName, item.cropVariety,
        item.categoryCode, item.typeCode, item.subCode,
        item.sourceOrigin, item.sourceDescription, item.initialQuantity,
        item.currentQuantity, item.plantedQuantity, item.harvestedQuantity, item.status,
        iso(item.seedEntryDate), iso(item.seedlingStartDate), iso(item.plantingDate),
        iso(item.harvestDate), item.sourceInstanceId, item.createBy,
        iso(item.createTime), iso(item.updateTime));
      stats.cropInstances++;
    }
  }

  // crop_orders
  if (Array.isArray(data.cropOrders)) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO crop_orders
      (id, order_code, customer_name, customer_contact, order_date, delivery_date, quantity, unit, price,
       total_amount, status, instance_ids, remarks, create_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of data.cropOrders) {
      stmt.run(item.id, item.orderCode, item.customerName, item.customerContact,
        item.orderDate, item.deliveryDate, item.quantity, item.unit, item.price,
        item.totalAmount, item.status, JSON.stringify(item.instanceIds || []),
        item.remarks, item.createBy, iso(item.createTime), iso(item.updateTime));
      stats.cropOrders++;
    }
  }

  // crop_varieties
  if (Array.isArray(data.cropVarieties)) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO crop_varieties
      (id, crop_code, category_code, category_name, type_code, type_name, variety_code, variety_name,
       sub_variety1_code, sub_variety1_name, sub_variety2_code, sub_variety2_name, detail_variety_code,
       alias, growth_cycle, target_yield, yield_unit, status, remarks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of data.cropVarieties) {
      stmt.run(item.id, item.cropCode, item.categoryCode, item.categoryName,
        item.typeCode, item.typeName, item.varietyCode, item.varietyName,
        item.subVariety1Code, item.subVariety1Name, item.subVariety2Code, item.subVariety2Name,
        item.detailVarietyCode, JSON.stringify(item.alias || []), item.growthCycle,
        item.targetYield, item.yieldUnit, item.status, item.remarks,
        iso(item.createTime), iso(item.updateTime));
      stats.cropVarieties++;
    }
  }
});

insert();
console.log('[migrate] Migration completed', stats);
