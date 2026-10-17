/**
 * 回收站处理器（P2）：作物库存 / 出库流水 / 流转追溯 / 行级采收 / 浇水 / 育苗繁殖记录 / 种植采收记录
 *
 * 说明：
 * - 库存、采收、浇水、繁殖记录、种植采收记录：物理删除，恢复 = 按快照重插 + 反向执行删除联动
 * - 出库流水 / 流转追溯：按已确认决策「只归档查看，不提供恢复」（restoreMode = view_only）
 */
import type { RecycleHandler } from '../types';
import { insertRow, parseJson, readRow, readRows, rowExists } from '../helpers';

/** 作物库存 */
export const inventoryStockHandler: RecycleHandler = {
  entityType: 'inventory_stock',
  label: '作物库存',
  deleteMode: 'hard',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'inventory_stock', id)
      || readRows(db, 'SELECT * FROM inventory_stock WHERE instance_id = ?', [id])[0]
      || null;
    if (!row) return null;
    return {
      entityCode: String(row.instance_id || ''),
      displayName: `库存 ${row.instance_id || row.id} · ${row.crop_name || ''}${row.variety_name ? '/' + row.variety_name : ''}`,
      snapshot: row,
    };
  },

  async restore(db, snapshot) {
    const id = String(snapshot.id);
    if (rowExists(db, 'inventory_stock', id)) {
      throw new Error('库存实例已存在，无法恢复（可能已被重新入库）');
    }
    insertRow(db, 'inventory_stock', snapshot);
    return { id };
  },
};

/** 行级采收入库（整链恢复：采收 + 库存 + 入库凭证 + 流水 + 源记录已入库量） */
export const harvestRecordHandler: RecycleHandler = {
  entityType: 'harvest_record',
  label: '采收入库记录',
  deleteMode: 'hard',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'harvest_records', id);
    if (!row) return null;
    const deps: Array<{ table: string; rows: Record<string, unknown>[] }> = [];
    const stockRows = readRows(db, `SELECT * FROM inventory_stock WHERE business_id = ? AND business_type = 'harvest'`, [id]);
    const inboundRows = readRows(db, 'SELECT * FROM inventory_inbound_records WHERE business_id = ?', [id]);
    const txRows = readRows(db, `SELECT * FROM inventory_transaction WHERE business_id = ? AND business_type = 'harvest'`, [id]);
    if (stockRows.length) deps.push({ table: 'inventory_stock', rows: stockRows });
    if (inboundRows.length) deps.push({ table: 'inventory_inbound_records', rows: inboundRows });
    if (txRows.length) deps.push({ table: 'inventory_transaction', rows: txRows });
    return {
      entityCode: String(row.instance_id || row.harvest_code || ''),
      displayName: `采收 ${row.harvest_code || id} · ${row.crop_name || ''}`,
      snapshot: row,
      dependencies: deps,
    };
  },

  async restore(db, snapshot, dependencies) {
    const id = String(snapshot.id);
    if (rowExists(db, 'harvest_records', id)) {
      throw new Error('采收记录已存在，无法恢复');
    }
    // 1) 回写源记录已入库量（与删除时的回退对称）
    const products = parseJson(snapshot.products);
    const totalQty = Array.isArray(products)
      ? products.reduce((sum: number, p: any) => sum + (Number(p?.harvestQuantity) || 0), 0)
      : 0;
    const sourceModule = String(snapshot.source_module || '');
    const sourceId = String(snapshot.source_id || '');
    if (totalQty > 0 && sourceId) {
      const now = new Date().toISOString();
      if (sourceModule === 'planting') {
        db.run('UPDATE plantings SET harvest_to_inventory_qty = COALESCE(harvest_to_inventory_qty,0) + ?, update_time = ? WHERE id = ?', [totalQty, now, sourceId]);
      } else if (sourceModule === 'seedling') {
        db.run('UPDATE seedlings SET harvest_stocked_count = COALESCE(harvest_stocked_count,0) + ?, update_time = ? WHERE id = ?', [totalQty, now, sourceId]);
      }
    }
    // 2) 回写库存 / 入库凭证 / 流水
    for (const dep of dependencies) {
      for (const row of dep.rows) {
        if (rowExists(db, dep.table, row.id)) continue;
        insertRow(db, dep.table, row);
      }
    }
    // 3) 最后插入采收主记录
    insertRow(db, 'harvest_records', snapshot);
    return { id };
  },
};

/** 浇水记录 */
export const wateringHandler: RecycleHandler = {
  entityType: 'watering_record',
  label: '浇水记录',
  deleteMode: 'hard',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'watering_records', id);
    if (!row) return null;
    return {
      entityCode: String(row.water_code || row.instance_code || ''),
      displayName: `浇水 ${row.water_code || id} · ${row.crop_name || ''}`,
      snapshot: row,
    };
  },

  async restore(db, snapshot) {
    const id = String(snapshot.id);
    if (rowExists(db, 'watering_records', id)) throw new Error('浇水记录已存在，无法恢复');
    insertRow(db, 'watering_records', snapshot);
    return { id };
  },
};

/** 育苗繁殖过程记录 */
export const propagationRecordHandler: RecycleHandler = {
  entityType: 'propagation_record',
  label: '育苗繁殖记录',
  deleteMode: 'hard',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'propagation_records', id);
    if (!row) return null;
    return {
      entityCode: String(row.batch_code || row.record_code || ''),
      displayName: `繁殖记录 ${row.record_code || id}`,
      snapshot: row,
    };
  },

  async restore(db, snapshot) {
    const id = String(snapshot.id);
    if (rowExists(db, 'propagation_records', id)) throw new Error('繁殖记录已存在，无法恢复');
    insertRow(db, 'propagation_records', snapshot);
    return { id };
  },
};

/** 种植采收记录（含采收入库/回流/自留种链条） */
export const plantingHarvestRecordHandler: RecycleHandler = {
  entityType: 'planting_harvest_record',
  label: '种植采收记录',
  deleteMode: 'hard',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'planting_harvest_records', id);
    if (!row) return null;
    const deps: Array<{ table: string; rows: Record<string, unknown>[] }> = [];

    let harvestId = row.harvest_record_id ? String(row.harvest_record_id) : '';
    let stockId = row.inventory_stock_id ? String(row.inventory_stock_id) : '';
    // 与删除逻辑一致：老数据无 harvest_record_id 时按 planting_id 反查
    if (!harvestId && row.planting_id) {
      const found = readRows(
        db,
        `SELECT hr.id AS hid, ist.id AS sid FROM harvest_records hr
         LEFT JOIN inventory_stock ist ON ist.business_id = hr.id AND ist.business_type = 'harvest'
         WHERE hr.source_module = 'planting' AND hr.source_id = ?
         ORDER BY hr.create_time DESC LIMIT 1`,
        [row.planting_id],
      )[0];
      if (found) {
        harvestId = String(found.hid || '');
        stockId = stockId || String(found.sid || '');
      }
    }

    if (harvestId) {
      const harvestRow = readRow(db, 'harvest_records', harvestId);
      if (harvestRow) deps.push({ table: 'harvest_records', rows: [harvestRow] });
      const stockRows = readRows(db, `SELECT * FROM inventory_stock WHERE business_id = ? AND business_type = 'harvest'`, [harvestId]);
      if (stockRows.length) deps.push({ table: 'inventory_stock', rows: stockRows });
      const inboundRows = readRows(db, 'SELECT * FROM inventory_inbound_records WHERE business_id = ?', [harvestId]);
      if (inboundRows.length) deps.push({ table: 'inventory_inbound_records', rows: inboundRows });
      const txRows = readRows(db, `SELECT * FROM inventory_transaction WHERE business_id = ? AND business_type = 'harvest'`, [harvestId]);
      if (txRows.length) deps.push({ table: 'inventory_transaction', rows: txRows });
    } else if (stockId) {
      const stockRow = readRow(db, 'inventory_stock', stockId);
      if (stockRow) {
        deps.push({ table: 'inventory_stock', rows: [stockRow] });
        const txRows = readRows(db, 'SELECT * FROM inventory_transaction WHERE instance_id = ?', [stockRow.instance_id]);
        if (txRows.length) deps.push({ table: 'inventory_transaction', rows: txRows });
      }
    }
    if (row.circulation_record_id) {
      const circRow = readRow(db, 'crop_circulation_records', row.circulation_record_id);
      if (circRow) deps.push({ table: 'crop_circulation_records', rows: [circRow] });
    }

    return {
      entityCode: String(row.record_code || row.harvest_code || ''),
      displayName: `种植采收 ${row.record_code || id} · ${row.crop_name || ''}`,
      snapshot: row,
      dependencies: deps,
    };
  },

  async restore(db, snapshot, dependencies) {
    const id = String(snapshot.id);
    if (rowExists(db, 'planting_harvest_records', id)) throw new Error('种植采收记录已存在，无法恢复');
    // 先回写上游（采收/库存/凭证/流水/回流），最后插主记录
    for (const dep of dependencies) {
      for (const row of dep.rows) {
        if (rowExists(db, dep.table, row.id)) continue;
        insertRow(db, dep.table, row);
      }
    }
    insertRow(db, 'planting_harvest_records', snapshot);
    // 恢复种植状态（删除时若无采收记录会回退为 growing）
    if (snapshot.planting_id) {
      const dest = String(snapshot.destination || '');
      if (dest === 'harvest' || dest === 'circulate' || dest === 'self_seed' || dest === 'planting_self_kept') {
        db.run('UPDATE plantings SET status = ?, update_time = ? WHERE id = ?', ['harvested', new Date().toISOString(), String(snapshot.planting_id)]);
      }
    }
    return { id };
  },
};

/** 出库流水（只归档查看） */
export const inventoryTransactionHandler: RecycleHandler = {
  entityType: 'inventory_transaction',
  label: '出库流水',
  deleteMode: 'hard',
  restoreMode: 'view_only',

  capture(db, id) {
    const row = readRow(db, 'inventory_transaction', id);
    if (!row) return null;
    return {
      entityCode: String(row.id || ''),
      displayName: `流水 ${row.id || ''} · ${row.instance_id || ''}`,
      snapshot: row,
    };
  },

  async restore(db, snapshot) {
    // view_only：不会被调用
    return { id: String(snapshot.id) };
  },
};

/** 流转追溯（只归档查看） */
export const materialFlowHandler: RecycleHandler = {
  entityType: 'material_flow_log',
  label: '流转记录',
  deleteMode: 'hard',
  restoreMode: 'view_only',

  capture(db, id) {
    const row = readRow(db, 'material_flow_log', id);
    if (!row) return null;
    return {
      entityCode: String(row.business_code || row.target_code || ''),
      displayName: `流转 ${row.flow_type || ''} ${row.target_code || ''}`,
      snapshot: row,
    };
  },

  async restore(db, snapshot) {
    return { id: String(snapshot.id) };
  },
};
