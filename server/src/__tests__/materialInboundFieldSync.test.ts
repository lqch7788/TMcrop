/**
 * 物料入库 → 物料主表 字段同步测试
 * 2026-09-27 字段链路修复配套测试
 *
 * 策略：mock db/index 的 getDatabase/saveDatabase 注入隔离内存 sql.js 库，
 *       直接调用真实的 syncInboundToMaterials，断言 SQL 结果（不启动 server、不污染主 DB）。
 *
 * 覆盖规则（见 db/materials.ts syncInboundToMaterials 注释）：
 * 1. 新建物料：supplier 缺省取单头兜底；minStock/maxStock/batchNo/remarks 全部落库
 * 2. 已有物料：quantity 累加；入库属性非空覆盖；minStock/maxStock 仅 >0 覆盖（不被 0 清零）
 * 3. 已有物料：name/category/specification/unit/barcode 属物料身份信息，入库不覆盖
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

// vi.mock 被提升，外部变量需用 vi.hoisted 容器
const { memRef } = vi.hoisted(() => ({ memRef: { db: null as unknown } }));

vi.mock('../db/index', () => ({
  getDatabase: () => {
    if (!memRef.db) throw new Error('测试内存库未初始化');
    return memRef.db;
  },
  saveDatabase: () => {
    // 测试中不落盘
  },
}));

import { syncInboundToMaterials } from '../db/materials';

const CREATE_MATERIALS = `
  CREATE TABLE materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    specification TEXT,
    unit TEXT,
    quantity REAL DEFAULT 0,
    minStock REAL DEFAULT 0,
    maxStock REAL DEFAULT 0,
    price TEXT,
    supplier TEXT,
    location TEXT,
    barcode TEXT,
    batchNo TEXT,
    productionDate TEXT,
    expiryDate TEXT,
    lastUpdateTime TEXT,
    dataStatus TEXT DEFAULT '启用',
    remarks TEXT,
    supplierId TEXT DEFAULT ''
  )
`;

let db: Database;

/** 查询单行，返回列名到值的对象 */
function selectRow(sql: string): Record<string, unknown> {
  const r = db.exec(sql);
  if (r.length === 0 || r[0].values.length === 0) return {};
  const { columns, values } = r[0];
  const row: Record<string, unknown> = {};
  columns.forEach((c, i) => (row[c] = values[0][i]));
  return row;
}

beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.run(CREATE_MATERIALS);
  memRef.db = db;
});

describe('syncInboundToMaterials 新建物料', () => {
  it('明细无 supplier 时继承单头兜底，且 minStock/maxStock/batchNo/remarks 全部落库', () => {
    syncInboundToMaterials(
      [
        {
          code: 'M1',
          name: '测试物料',
          category: '其他类-测试',
          unit: '件',
          quantity: 10,
          minStock: 5,
          maxStock: 100,
          price: '9.9',
          location: 'A1',
          batchNo: 'B1',
          productionDate: '2026-09-01',
          expiryDate: '2027-09-01',
          remarks: '备注X',
          // 无 supplier：模拟前端入库明细（供应商在单头）
        },
      ],
      { fallbackSupplier: '单头供应商' }
    );

    const row = selectRow("SELECT * FROM materials WHERE code = 'M1'");
    expect(row.supplier).toBe('单头供应商');
    expect(row.minStock).toBe(5);
    expect(row.maxStock).toBe(100);
    expect(row.batchNo).toBe('B1');
    expect(row.remarks).toBe('备注X');
    expect(row.quantity).toBe(10);
    expect(row.dataStatus).toBe('启用');
  });

  it('明细自带 supplier 时优先于单头兜底', () => {
    syncInboundToMaterials(
      [{ code: 'M3', name: '物料3', quantity: 1, supplier: '明细供应商' }],
      { fallbackSupplier: '单头供应商' }
    );
    expect(selectRow("SELECT * FROM materials WHERE code = 'M3'").supplier).toBe('明细供应商');
  });

  it('无 code 的明细行被跳过，不产生任何写入', () => {
    syncInboundToMaterials([{ name: '无编码', quantity: 5 }], { fallbackSupplier: 'X' });
    const r = db.exec('SELECT COUNT(*) FROM materials');
    expect(r[0].values[0][0]).toBe(0);
  });
});

describe('syncInboundToMaterials 已有物料', () => {
  beforeEach(() => {
    db.run(
      `INSERT INTO materials (code, name, unit, quantity, minStock, maxStock, price, supplier, location, barcode, remarks, dataStatus) ` +
        `VALUES ('M2', '旧名', '个', 10, 5, 100, '1', '旧供应商', '旧位置', 'OLD-BC', '旧备注', '停用')`
    );
  });

  it('数量累加 + 非空入库属性覆盖 + 阈值不被 0 清零 + 身份字段不覆盖 + 状态复位', () => {
    syncInboundToMaterials(
      [
        {
          code: 'M2',
          name: '新名',
          category: '新分类',
          specification: '新规格',
          unit: '件',
          barcode: 'NEW-BC',
          quantity: 7,
          price: '2',
          location: '新位置',
          remarks: '新备注',
          // minStock/maxStock 缺失（前端不填）：不得把已有的 5/100 清零
        },
      ],
      { fallbackSupplier: '新供应商' }
    );

    const row = selectRow("SELECT * FROM materials WHERE code = 'M2'");
    expect(row.quantity).toBe(17); // 10 + 7 累加
    expect(row.minStock).toBe(5); // 未被清零
    expect(row.maxStock).toBe(100); // 未被清零
    expect(row.price).toBe('2'); // 覆盖
    expect(row.supplier).toBe('新供应商'); // 单头兜底覆盖
    expect(row.location).toBe('新位置'); // 覆盖
    expect(row.remarks).toBe('新备注'); // 覆盖
    expect(row.dataStatus).toBe('启用'); // 复位
    // 身份字段不覆盖
    expect(row.name).toBe('旧名');
    expect(row.unit).toBe('个');
    expect(row.barcode).toBe('OLD-BC');
    expect(row.category).toBeNull();
    expect(row.specification).toBeNull();
  });

  it('明细 minStock/maxStock > 0 时覆盖已有阈值', () => {
    syncInboundToMaterials([{ code: 'M2', quantity: 1, minStock: 20, maxStock: 300 }]);
    const row = selectRow("SELECT * FROM materials WHERE code = 'M2'");
    expect(row.minStock).toBe(20);
    expect(row.maxStock).toBe(300);
  });

  it('明细属性为空字符串时不清空已有值', () => {
    syncInboundToMaterials([{ code: 'M2', quantity: 1, price: '', location: '', remarks: '' }]);
    const row = selectRow("SELECT * FROM materials WHERE code = 'M2'");
    expect(row.price).toBe('1');
    expect(row.location).toBe('旧位置');
    expect(row.remarks).toBe('旧备注');
  });
});
