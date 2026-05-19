/**
 * 基础数据路由
 * 提供部门、仓库、温室等基础数据的 API
 */

import { Router } from 'express';
import { getDatabase } from '../db/index';
import { exportBasicData } from '../db/seedBasicData';

const router = Router();

/**
 * 获取所有部门
 * GET /api/basic-data/departments
 */
router.get('/departments', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT d.id, d.oid, d.code, d.name, d.manager_id, d.manager_name, d.parent_oid, d.sort_number, d.description, d.status, d.created_at,
             p.name as parent_name
      FROM departments d
      LEFT JOIN departments p ON d.parent_oid = p.oid
      WHERE d.status = 'active'
      ORDER BY d.sort_number
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const departments = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        // 转换下划线命名到驼峰命名
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('获取部门数据失败:', error);
    res.status(500).json({ success: false, error: '获取部门数据失败' });
  }
});

/**
 * 创建部门
 * POST /api/basic-data/departments
 * 同步：自动创建关联的组织节点（org_type='department'）
 */
router.post('/departments', (req, res) => {
  try {
    const db = getDatabase();
    const { name, code, parentOid, managerId, managerName, sortNumber, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: '部门名称和编码不能为空' });
    }

    const oid = `DEPT${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO departments (id, oid, name, code, parent_oid, manager_id, manager_name, sort_number, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [oid, oid, name, code, parentOid || '', managerId || '', managerName || '', sortNumber || 0, description || '', now, now]);

    // 同步：自动创建关联的组织节点
    const orgOid = `ORG_${Date.now()}`;
    db.run(`
      INSERT INTO organizations (id, oid, parent_oid, aid, name, org_type, contact_person, sort_order, status, department_id, department_name, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, 'department', ?, 0, 'active', ?, ?, ?, ?)
    `, [`ORG_ID_${Date.now()}`, orgOid, orgOid, name, managerName || '', oid, name, now, now]);

    res.status(201).json({ success: true, message: '部门创建成功', data: { id: oid, oid, name, code, orgOid } });
  } catch (error) {
    console.error('创建部门失败:', error);
    res.status(500).json({ success: false, error: '创建部门失败' });
  }
});

/**
 * 更新部门
 * PUT /api/basic-data/departments/:id
 */
router.put('/departments/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { name, code, parentOid, managerId, managerName, sortNumber, description, status } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE departments
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          parent_oid = COALESCE(?, parent_oid),
          manager_id = COALESCE(?, manager_id),
          manager_name = COALESCE(?, manager_name),
          sort_number = COALESCE(?, sort_number),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [name, code, parentOid, managerId, managerName, sortNumber, description, status, now, id]);

    // 双向同步：更新关联的组织节点
    if (name || managerName) {
      db.run(`
        UPDATE organizations
        SET name = COALESCE(?, name),
            contact_person = COALESCE(?, contact_person),
            department_name = COALESCE(?, department_name),
            updated_at = ?
        WHERE department_id = ? AND status = 'active'
      `, [name || null, managerName || null, name || null, now, id]);
    }

    res.json({ success: true, message: '部门更新成功' });
  } catch (error) {
    console.error('更新部门失败:', error);
    res.status(500).json({ success: false, error: '更新部门失败' });
  }
});

/**
 * 删除部门（软删除）
 * DELETE /api/basic-data/departments/:id
 */
router.delete('/departments/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE departments SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, id]);

    // 双向同步：同步禁用关联的组织节点
    db.run(`UPDATE organizations SET status = 'inactive', updated_at = ? WHERE department_id = ?`, [now, id]);

    res.json({ success: true, message: '部门删除成功' });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({ success: false, error: '删除部门失败' });
  }
});

/**
 * 获取所有仓库
 * GET /api/basic-data/warehouses
 */
router.get('/warehouses', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, name, code, location, capacity, current_stock, warehouse_type, status, created_at
      FROM warehouses
      WHERE status = 'active'
      ORDER BY code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const warehouses = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: warehouses });
  } catch (error) {
    console.error('获取仓库数据失败:', error);
    res.status(500).json({ success: false, error: '获取仓库数据失败' });
  }
});

/**
 * 创建仓库
 * POST /api/basic-data/warehouses
 */
router.post('/warehouses', (req, res) => {
  try {
    const db = getDatabase();
    const { name, code, warehouseType, location, capacity, managerId, managerName } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: '仓库名称和编码不能为空' });
    }

    const id = `WH${Date.now()}`;
    const oid = `WH${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO warehouses (id, oid, name, code, warehouse_type, location, capacity, manager_id, manager_name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [id, oid, name, code, warehouseType || '', location || '', capacity || 0, managerId || '', managerName || '', now, now]);

    res.json({ success: true, message: '仓库创建成功', data: { id, oid, name, code } });
  } catch (error) {
    console.error('创建仓库失败:', error);
    res.status(500).json({ success: false, error: '创建仓库失败' });
  }
});

/**
 * 更新仓库
 * PUT /api/basic-data/warehouses/:id
 */
router.put('/warehouses/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { name, code, warehouseType, location, capacity, managerId, managerName, status } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE warehouses
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          warehouse_type = COALESCE(?, warehouse_type),
          location = COALESCE(?, location),
          capacity = COALESCE(?, capacity),
          manager_id = COALESCE(?, manager_id),
          manager_name = COALESCE(?, manager_name),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [name, code, warehouseType, location, capacity, managerId, managerName, status, now, id]);

    res.json({ success: true, message: '仓库更新成功' });
  } catch (error) {
    console.error('更新仓库失败:', error);
    res.status(500).json({ success: false, error: '更新仓库失败' });
  }
});

/**
 * 删除仓库（软删除，设置status为inactive）
 * DELETE /api/basic-data/warehouses/:id
 */
router.delete('/warehouses/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE warehouses SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: '仓库删除成功' });
  } catch (error) {
    console.error('删除仓库失败:', error);
    res.status(500).json({ success: false, error: '删除仓库失败' });
  }
});

/**
 * 获取所有温室
 * GET /api/basic-data/greenhouses
 */
router.get('/greenhouses', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, code, name, greenhouse_type, area, location, base_oid, base_name,
             company_id, company_name, lng, lat, crop, growth_day, manager, phone,
             soil_type, ph, intro, greenhouse_count, field_area, status, created_at
      FROM greenhouses
      WHERE status = 'active'
      ORDER BY company_name, code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const greenhouses = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: greenhouses });
  } catch (error) {
    console.error('获取温室数据失败:', error);
    res.status(500).json({ success: false, error: '获取温室数据失败' });
  }
});

/**
 * 初始化基础数据
 * POST /api/basic-data/init
 */
router.post('/init', (req, res) => {
  try {
    const db = getDatabase();

    // 安全地添加 greenhouses 新列（如果列已存在则忽略错误）
    const newColumns = [
      'company_id TEXT DEFAULT ""',
      'company_name TEXT DEFAULT ""',
      'lng REAL DEFAULT 0',
      'lat REAL DEFAULT 0',
      'crop TEXT DEFAULT ""',
      'growth_day INTEGER DEFAULT 0',
      'manager TEXT DEFAULT ""',
      'phone TEXT DEFAULT ""',
      'soil_type TEXT DEFAULT ""',
      'ph REAL DEFAULT 0',
      'intro TEXT DEFAULT ""',
      'greenhouse_count INTEGER DEFAULT 0',
      'field_area REAL DEFAULT 0'
    ];

    for (const colDef of newColumns) {
      try {
        const colName = colDef.split(' ')[0];
        db.run(`ALTER TABLE greenhouses ADD COLUMN ${colDef}`);
      } catch (e) {
        // 列可能已存在，忽略错误
      }
    }

    // 导出基础数据
    exportBasicData();
    res.json({ success: true, message: '基础数据初始化成功' });
  } catch (error) {
    console.error('初始化基础数据失败:', error);
    res.status(500).json({ success: false, error: '初始化基础数据失败' });
  }
});

/**
 * 获取所有编码规则
 * GET /api/basic-data/code-rules
 */
router.get('/code-rules', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, entity_type, prefix, seq_length, current_seq, date_pattern, description, status, created_at
      FROM sys_code_rules
      WHERE status = 'active'
      ORDER BY entity_type
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const rules = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('获取编码规则失败:', error);
    res.status(500).json({ success: false, error: '获取编码规则失败' });
  }
});

/**
 * 获取所有区域
 * GET /api/basic-data/zones
 */
router.get('/zones', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT z.id, z.oid, z.zone_code, z.zone_name, z.greenhouse_oid, z.zone_type, z.area, z.sort_order, z.status, z.created_at,
             g.name as greenhouseName
      FROM zones z
      LEFT JOIN greenhouses g ON z.greenhouse_oid = g.oid
      WHERE z.status = 'active'
      ORDER BY z.zone_code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const zones = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      // 将 greenhouseOid 映射到 baseOid，供前端统一使用
      obj.baseOid = obj.greenhouseOid;
      obj.baseName = obj.greenhouseName;
      return obj;
    });

    res.json({ success: true, data: zones });
  } catch (error) {
    console.error('获取区域数据失败:', error);
    res.status(500).json({ success: false, error: '获取区域数据失败' });
  }
});

/**
 * 创建区域
 * POST /api/basic-data/zones
 */
router.post('/zones', (req, res) => {
  try {
    const db = getDatabase();
    const { zoneName, zoneCode, baseOid, zoneType, area, sortOrder, description } = req.body;

    if (!zoneName || !zoneCode) {
      return res.status(400).json({ success: false, error: '区域名称和编码不能为空' });
    }

    const id = `ZN${Date.now()}`;
    const oid = `ZN${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO zones (id, oid, zone_code, zone_name, greenhouse_oid, zone_type, area, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [id, oid, zoneCode, zoneName, baseOid || '', zoneType || '', area || 0, sortOrder || 0, now, now]);

    res.json({ success: true, message: '区域创建成功', data: { id, oid, zoneCode, zoneName } });
  } catch (error) {
    console.error('创建区域失败:', error);
    res.status(500).json({ success: false, error: '创建区域失败' });
  }
});

/**
 * 更新区域
 * PUT /api/basic-data/zones/:id
 */
router.put('/zones/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { zoneName, zoneCode, baseOid, zoneType, area, sortOrder, status, description } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE zones
      SET zone_name = COALESCE(?, zone_name),
          zone_code = COALESCE(?, zone_code),
          greenhouse_oid = COALESCE(?, greenhouse_oid),
          zone_type = COALESCE(?, zone_type),
          area = COALESCE(?, area),
          sort_order = COALESCE(?, sort_order),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [zoneName, zoneCode, baseOid, zoneType, area, sortOrder, status, now, id]);

    res.json({ success: true, message: '区域更新成功' });
  } catch (error) {
    console.error('更新区域失败:', error);
    res.status(500).json({ success: false, error: '更新区域失败' });
  }
});

/**
 * 删除区域（软删除）
 * DELETE /api/basic-data/zones/:id
 */
router.delete('/zones/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE zones SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: '区域删除成功' });
  } catch (error) {
    console.error('删除区域失败:', error);
    res.status(500).json({ success: false, error: '删除区域失败' });
  }
});

/**
 * 获取所有地块
 * GET /api/basic-data/blocks
 */
router.get('/blocks', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT b.id, b.oid, b.block_code, b.block_name, b.zone_oid, b.block_type, b.area, b.sort_order, b.status, b.created_at,
             z.zone_name, z.zone_code
      FROM blocks b
      LEFT JOIN zones z ON b.zone_oid = z.oid
      WHERE b.status = 'active'
      ORDER BY b.block_code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const blocks = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: blocks });
  } catch (error) {
    console.error('获取地块数据失败:', error);
    res.status(500).json({ success: false, error: '获取地块数据失败' });
  }
});

/**
 * 创建地块
 * POST /api/basic-data/blocks
 */
router.post('/blocks', (req, res) => {
  try {
    const db = getDatabase();
    const { blockName, blockCode, zoneOid, blockType, area, sortOrder, description } = req.body;

    if (!blockName || !blockCode) {
      return res.status(400).json({ success: false, error: '地块名称和编码不能为空' });
    }

    const id = `BK${Date.now()}`;
    const oid = `BK${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO blocks (id, oid, block_code, block_name, zone_oid, block_type, area, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [id, oid, blockCode, blockName, zoneOid || '', blockType || '', area || 0, sortOrder || 0, now, now]);

    res.json({ success: true, message: '地块创建成功', data: { id, oid, blockCode, blockName } });
  } catch (error) {
    console.error('创建地块失败:', error);
    res.status(500).json({ success: false, error: '创建地块失败' });
  }
});

/**
 * 更新地块
 * PUT /api/basic-data/blocks/:id
 */
router.put('/blocks/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { blockName, blockCode, zoneOid, blockType, area, sortOrder, status, description } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE blocks
      SET block_name = COALESCE(?, block_name),
          block_code = COALESCE(?, block_code),
          zone_oid = COALESCE(?, zone_oid),
          block_type = COALESCE(?, block_type),
          area = COALESCE(?, area),
          sort_order = COALESCE(?, sort_order),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [blockName, blockCode, zoneOid, blockType, area, sortOrder, status, now, id]);

    res.json({ success: true, message: '地块更新成功' });
  } catch (error) {
    console.error('更新地块失败:', error);
    res.status(500).json({ success: false, error: '更新地块失败' });
  }
});

/**
 * 删除地块（软删除）
 * DELETE /api/basic-data/blocks/:id
 */
router.delete('/blocks/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE blocks SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: '地块删除成功' });
  } catch (error) {
    console.error('删除地块失败:', error);
    res.status(500).json({ success: false, error: '删除地块失败' });
  }
});

/**
 * 获取所有审批规则
 * GET /api/basic-data/approval-rules
 */
router.get('/approval-rules', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, rule_code, rule_name, business_type, flow_id, conditions, is_active, created_at
      FROM sys_approval_rules
      ORDER BY business_type
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const rules = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      // 解析 conditions JSON
      if (obj.conditions) {
        try {
          obj.conditions = JSON.parse(obj.conditions);
        } catch (e) {
          obj.conditions = {};
        }
      }
      return obj;
    });

    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('获取审批规则失败:', error);
    res.status(500).json({ success: false, error: '获取审批规则失败' });
  }
});

/**
 * 获取所有字典分类
 * GET /api/basic-data/dictionary-categories
 */
router.get('/dictionary-categories', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, code, name, module, description, sort_order, status, created_at
      FROM dictionary_categories
      WHERE status = 'active'
      ORDER BY sort_order
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const categories = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取字典分类失败:', error);
    res.status(500).json({ success: false, error: '获取字典分类失败' });
  }
});

/**
 * 获取所有职位
 * GET /api/basic-data/positions
 */
router.get('/positions', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT p.id, p.oid, p.code, p.name, p.department_oid, p.level, p.description, p.sort_order, p.status, p.created_at,
             d.name as department_name
      FROM positions p
      LEFT JOIN departments d ON p.department_oid = d.oid
      WHERE p.status = 'active'
      ORDER BY p.sort_order
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const positions = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: positions });
  } catch (error) {
    console.error('获取职位数据失败:', error);
    res.status(500).json({ success: false, error: '获取职位数据失败' });
  }
});

/**
 * 创建职位
 * POST /api/basic-data/positions
 */
router.post('/positions', (req, res) => {
  try {
    const db = getDatabase();
    const { code, name, departmentOid, departmentName, level, description, sortOrder } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: '职位编码和名称不能为空' });
    }

    const id = `POS${Date.now()}`;
    const oid = `POS${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO positions (id, oid, code, name, department_oid, department_name, level, description, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [id, oid, code, name, departmentOid || '', departmentName || '', level || 1, description || '', sortOrder || 0, now, now]);

    res.status(201).json({ success: true, message: '职位创建成功', data: { id, oid, code, name } });
  } catch (error) {
    console.error('创建职位失败:', error);
    res.status(500).json({ success: false, error: '创建职位失败' });
  }
});

/**
 * 更新职位
 * PUT /api/basic-data/positions/:id
 */
router.put('/positions/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { code, name, departmentOid, departmentName, level, description, sortOrder, status } = req.body;

    // 检查职位是否存在
    const checkResult = db.exec('SELECT id FROM positions WHERE id = ?', [id]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '职位不存在' });
    }

    const now = new Date().toISOString();

    db.run(`
      UPDATE positions
      SET code = COALESCE(?, code),
          name = COALESCE(?, name),
          department_oid = COALESCE(?, department_oid),
          department_name = COALESCE(?, department_name),
          level = COALESCE(?, level),
          description = COALESCE(?, description),
          sort_order = COALESCE(?, sort_order),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [code, name, departmentOid, departmentName, level, description, sortOrder, status, now, id]);

    res.json({ success: true, message: '职位更新成功' });
  } catch (error) {
    console.error('更新职位失败:', error);
    res.status(500).json({ success: false, error: '更新职位失败' });
  }
});

/**
 * 删除职位（软删除）
 * DELETE /api/basic-data/positions/:id
 */
router.delete('/positions/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // 检查职位是否存在
    const checkResult = db.exec('SELECT id FROM positions WHERE id = ?', [id]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '职位不存在' });
    }

    const now = new Date().toISOString();

    // 软删除：设置状态为 inactive
    db.run('UPDATE positions SET status = ?, updated_at = ? WHERE id = ?', ['inactive', now, id]);

    res.json({ success: true, message: '职位删除成功' });
  } catch (error) {
    console.error('删除职位失败:', error);
    res.status(500).json({ success: false, error: '删除职位失败' });
  }
});

/**
 * 批量删除职位（软删除）
 * POST /api/basic-data/positions/batch-delete
 */
router.post('/positions/batch-delete', (req, res) => {
  try {
    const db = getDatabase();
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 ids 参数或 ids 不是数组' });
    }

    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');

    db.run(`UPDATE positions SET status = ?, updated_at = ? WHERE id IN (${placeholders})`, ['inactive', now, ...ids]);

    res.json({ success: true, message: '批量删除职位成功', data: { deletedCount: ids.length } });
  } catch (error) {
    console.error('批量删除职位失败:', error);
    res.status(500).json({ success: false, error: '批量删除职位失败' });
  }
});

/**
 * 获取所有班组
 * GET /api/basic-data/teams
 */
router.get('/teams', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT t.id, t.oid, t.team_code, t.team_name, t.department_oid, t.leader_id, t.leader_name, t.shift_type, t.member_count, t.status, t.created_at,
             d.name as department_name
      FROM teams t
      LEFT JOIN departments d ON t.department_oid = d.oid
      WHERE t.status = 'active'
      ORDER BY t.team_code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const teams = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: teams });
  } catch (error) {
    console.error('获取班组数据失败:', error);
    res.status(500).json({ success: false, error: '获取班组数据失败' });
  }
});

/**
 * 创建班组
 * POST /api/basic-data/teams
 */
router.post('/teams', (req, res) => {
  try {
    const db = getDatabase();
    const { teamName, teamCode, departmentOid, leaderName, shiftType, memberCount, description } = req.body;

    if (!teamName || !teamCode) {
      return res.status(400).json({ success: false, error: '班组名称和编码不能为空' });
    }

    const id = `TM${Date.now()}`;
    const oid = `TM${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO teams (id, oid, team_code, team_name, department_oid, leader_name, shift_type, member_count, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [id, oid, teamCode, teamName, departmentOid || '', leaderName || '', shiftType || '', memberCount || 0, description || '', now, now]);

    res.json({ success: true, message: '班组创建成功', data: { id, oid, teamCode, teamName } });
  } catch (error) {
    console.error('创建班组失败:', error);
    res.status(500).json({ success: false, error: '创建班组失败' });
  }
});

/**
 * 更新班组
 * PUT /api/basic-data/teams/:id
 */
router.put('/teams/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { teamName, teamCode, departmentOid, leaderName, shiftType, memberCount, description, status } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE teams
      SET team_name = COALESCE(?, team_name),
          team_code = COALESCE(?, team_code),
          department_oid = COALESCE(?, department_oid),
          leader_name = COALESCE(?, leader_name),
          shift_type = COALESCE(?, shift_type),
          member_count = COALESCE(?, member_count),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [teamName, teamCode, departmentOid, leaderName, shiftType, memberCount, description, status, now, id]);

    res.json({ success: true, message: '班组更新成功' });
  } catch (error) {
    console.error('更新班组失败:', error);
    res.status(500).json({ success: false, error: '更新班组失败' });
  }
});

/**
 * 删除班组（软删除）
 * DELETE /api/basic-data/teams/:id
 */
router.delete('/teams/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE teams SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: '班组删除成功' });
  } catch (error) {
    console.error('删除班组失败:', error);
    res.status(500).json({ success: false, error: '删除班组失败' });
  }
});

/**
 * 获取所有设备
 * GET /api/basic-data/devices
 */
router.get('/devices', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT d.id, d.oid, d.device_code, d.device_name, d.device_type, d.manufacturer, d.serial_number,
             d.greenhouse_oid, d.location, d.install_date, d.status, d.last_maintenance_date,
             d.next_maintenance_date, d.created_at,
             g.name as greenhouse_name
      FROM devices d
      LEFT JOIN greenhouses g ON d.greenhouse_oid = g.oid
      WHERE d.status = 'active'
      ORDER BY d.device_code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const devices = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: devices });
  } catch (error) {
    console.error('获取设备数据失败:', error);
    res.status(500).json({ success: false, error: '获取设备数据失败' });
  }
});

/**
 * 创建设备
 * POST /api/basic-data/devices
 */
router.post('/devices', (req, res) => {
  try {
    const db = getDatabase();
    const { deviceName, deviceCode, deviceType, manufacturer, serialNumber, greenhouseOid, location, installDate, description } = req.body;

    if (!deviceName || !deviceCode) {
      return res.status(400).json({ success: false, error: '设备名称和编码不能为空' });
    }

    const id = `DEV${Date.now()}`;
    const oid = `DEV${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO devices (id, oid, device_code, device_name, device_type, manufacturer, serial_number, greenhouse_oid, location, install_date, status, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', ?, ?, ?)
    `, [id, oid, deviceCode, deviceName, deviceType || '', manufacturer || '', serialNumber || '', greenhouseOid || '', location || '', installDate || '', description || '', now, now]);

    res.json({ success: true, message: '设备创建成功', data: { id, oid, deviceCode, deviceName } });
  } catch (error) {
    console.error('创建设备失败:', error);
    res.status(500).json({ success: false, error: '创建设备失败' });
  }
});

/**
 * 更新设备
 * PUT /api/basic-data/devices/:id
 */
router.put('/devices/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { deviceName, deviceCode, deviceType, manufacturer, serialNumber, greenhouseOid, location, installDate, status, description } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE devices
      SET device_name = COALESCE(?, device_name),
          device_code = COALESCE(?, device_code),
          device_type = COALESCE(?, device_type),
          manufacturer = COALESCE(?, manufacturer),
          serial_number = COALESCE(?, serial_number),
          greenhouse_oid = COALESCE(?, greenhouse_oid),
          location = COALESCE(?, location),
          install_date = COALESCE(?, install_date),
          status = COALESCE(?, status),
          description = COALESCE(?, description),
          updated_at = ?
      WHERE id = ?
    `, [deviceName, deviceCode, deviceType, manufacturer, serialNumber, greenhouseOid, location, installDate, status, description, now, id]);

    res.json({ success: true, message: '设备更新成功' });
  } catch (error) {
    console.error('更新设备失败:', error);
    res.status(500).json({ success: false, error: '更新设备失败' });
  }
});

/**
 * 删除设备（软删除）
 * DELETE /api/basic-data/devices/:id
 */
router.delete('/devices/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE devices SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: '设备删除成功' });
  } catch (error) {
    console.error('删除设备失败:', error);
    res.status(500).json({ success: false, error: '删除设备失败' });
  }
});

/**
 * 获取所有温室
 * GET /api/basic-data/greenhouses
 */
router.get('/greenhouses', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, code, name, greenhouse_type, area, location, base_oid, base_name,
             company_id, company_name, lng, lat, crop, growth_day, manager, phone,
             soil_type, ph, intro, greenhouse_count, field_area, status, created_at
      FROM greenhouses
      WHERE status = 'active'
      ORDER BY company_name, code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const greenhouses = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: greenhouses });
  } catch (error) {
    console.error('获取温室数据失败:', error);
    res.status(500).json({ success: false, error: '获取温室数据失败' });
  }
});

/**
 * 创建温室
 * POST /api/basic-data/greenhouses
 */
router.post('/greenhouses', (req, res) => {
  try {
    const db = getDatabase();
    const {
      name, code, greenhouseType, area, location,
      baseOid, baseName, companyId, companyName,
      lng, lat, crop, growthDay, manager, phone,
      soilType, ph, intro, greenhouseCount, fieldArea
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: '温室名称和编码不能为空' });
    }

    const id = `GH${Date.now()}`;
    const oid = `GH${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO greenhouses (id, oid, code, name, greenhouse_type, area, location,
             base_oid, base_name, company_id, company_name, lng, lat, crop, growth_day,
             manager, phone, soil_type, ph, intro, greenhouse_count, field_area,
             status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [
      id, oid, code, name, greenhouseType || '', area || 0, location || '',
      baseOid || '', baseName || '', companyId || '', companyName || '',
      lng || 0, lat || 0, crop || '', growthDay || 0,
      manager || '', phone || '', soilType || '', ph || 0, intro || '',
      greenhouseCount || 0, fieldArea || 0,
      now, now
    ]);

    res.json({ success: true, message: '温室创建成功', data: { id, oid, code, name } });
  } catch (error) {
    console.error('创建温室失败:', error);
    res.status(500).json({ success: false, error: '创建温室失败' });
  }
});

/**
 * 更新温室
 * PUT /api/basic-data/greenhouses/:id
 */
router.put('/greenhouses/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const {
      name, code, greenhouseType, area, location,
      baseOid, baseName, companyId, companyName,
      lng, lat, crop, growthDay, manager, phone,
      soilType, ph, intro, greenhouseCount, fieldArea, status
    } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE greenhouses
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          greenhouse_type = COALESCE(?, greenhouse_type),
          area = COALESCE(?, area),
          location = COALESCE(?, location),
          base_oid = COALESCE(?, base_oid),
          base_name = COALESCE(?, base_name),
          company_id = COALESCE(?, company_id),
          company_name = COALESCE(?, company_name),
          lng = COALESCE(?, lng),
          lat = COALESCE(?, lat),
          crop = COALESCE(?, crop),
          growth_day = COALESCE(?, growth_day),
          manager = COALESCE(?, manager),
          phone = COALESCE(?, phone),
          soil_type = COALESCE(?, soil_type),
          ph = COALESCE(?, ph),
          intro = COALESCE(?, intro),
          greenhouse_count = COALESCE(?, greenhouse_count),
          field_area = COALESCE(?, field_area),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [
      name, code, greenhouseType, area, location,
      baseOid, baseName, companyId, companyName,
      lng, lat, crop, growthDay, manager, phone,
      soilType, ph, intro, greenhouseCount, fieldArea, status,
      now, id
    ]);

    res.json({ success: true, message: '温室更新成功' });
  } catch (error) {
    console.error('更新温室失败:', error);
    res.status(500).json({ success: false, error: '更新温室失败' });
  }
});

/**
 * 删除温室（软删除）
 * DELETE /api/basic-data/greenhouses/:id
 */
router.delete('/greenhouses/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE greenhouses SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: '温室删除成功' });
  } catch (error) {
    console.error('删除温室失败:', error);
    res.status(500).json({ success: false, error: '删除温室失败' });
  }
});

/**
 * 获取所有设备
 * GET /api/basic-data/devices
 */
router.get('/devices', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT d.id, d.oid, d.device_code, d.device_name, d.device_type, d.manufacturer, d.serial_number,
             d.greenhouse_oid, d.location, d.install_date, d.status, d.last_maintenance_date,
             d.next_maintenance_date, d.created_at,
             g.name as greenhouse_name
      FROM devices d
      LEFT JOIN greenhouses g ON d.greenhouse_oid = g.oid
      WHERE d.status = 'active'
      ORDER BY d.device_code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const devices = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: devices });
  } catch (error) {
    console.error('获取设备数据失败:', error);
    res.status(500).json({ success: false, error: '获取设备数据失败' });
  }
});

/**
 * 获取所有通知渠道
 * GET /api/basic-data/notification-channels
 */
router.get('/notification-channels', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, channel_code, channel_name, channel_type, config, is_active, sort_order, created_at
      FROM notification_channels
      WHERE is_active = 1
      ORDER BY sort_order
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const channels = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      // 解析 config JSON
      if (obj.config) {
        try {
          obj.config = JSON.parse(obj.config);
        } catch (e) {
          obj.config = {};
        }
      }
      return obj;
    });

    res.json({ success: true, data: channels });
  } catch (error) {
    console.error('获取通知渠道失败:', error);
    res.status(500).json({ success: false, error: '获取通知渠道失败' });
  }
});

/**
 * 获取所有通知规则
 * GET /api/basic-data/notification-rules
 */
router.get('/notification-rules', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, rule_code, rule_name, event_type, recipient_type, channel_ids, template_id, frequency, conditions, is_active, created_at
      FROM notification_rules
      WHERE is_active = 1
      ORDER BY event_type
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const rules = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      // 解析 conditions JSON
      if (obj.conditions) {
        try {
          obj.conditions = JSON.parse(obj.conditions);
        } catch (e) {
          obj.conditions = {};
        }
      }
      return obj;
    });

    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('获取通知规则失败:', error);
    res.status(500).json({ success: false, error: '获取通知规则失败' });
  }
});

/**
 * 获取所有审批流程
 * GET /api/basic-data/approval-workflows
 */
router.get('/approval-workflows', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, workflow_code, workflow_name, business_type, description, is_active, created_at
      FROM approval_workflows
      WHERE is_active = 1
      ORDER BY business_type
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const workflows = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: workflows });
  } catch (error) {
    console.error('获取审批流程失败:', error);
    res.status(500).json({ success: false, error: '获取审批流程失败' });
  }
});

/**
 * 获取指定流程的所有审批节点
 * GET /api/basic-data/approval-nodes?workflowOid=xxx
 */
router.get('/approval-nodes', (req, res) => {
  try {
    const db = getDatabase();
    const { workflowOid } = req.query;

    let sql = `
      SELECT id, oid, workflow_oid, node_code, node_name, node_type, approver_type, approver_id, approver_name,
             timeout_hours, timeout_action, is_required, conditions, sort_order, created_at
      FROM approval_nodes
    `;
    const bindings: (string | number)[] = [];

    if (workflowOid) {
      sql += ` WHERE workflow_oid = ? ORDER BY sort_order`;
      bindings.push(workflowOid as string);
    } else {
      sql += ` ORDER BY workflow_oid, sort_order`;
    }

    const stmt = db.prepare(sql);
    if (bindings.length > 0) {
      stmt.bind(bindings);
    }

    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      // 将下划线字段名转换为驼峰命名
      const camelRow: Record<string, unknown> = {};
      for (const key in row) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        camelRow[camelKey] = row[key];
      }
      // 解析 conditions JSON
      if (camelRow.conditions) {
        try {
          camelRow.conditions = JSON.parse(camelRow.conditions as string);
        } catch (e) {
          camelRow.conditions = {};
        }
      }
      results.push(camelRow);
    }
    stmt.free();

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('获取审批节点失败:', error);
    res.status(500).json({ success: false, error: '获取审批节点失败' });
  }
});

/**
 * 获取所有系统配置
 * GET /api/basic-data/system-configs
 */
router.get('/system-configs', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, config_key, config_value, config_type, category, description, is_active, created_at, updated_at
      FROM system_configs
      WHERE is_active = 1
      ORDER BY category, config_key
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const configs = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ success: false, error: '获取系统配置失败' });
  }
});

/**
 * 创建系统配置
 * POST /api/basic-data/system-configs
 */
router.post('/system-configs', (req, res) => {
  try {
    const db = getDatabase();
    const { configKey, configValue, configType, category, description } = req.body;

    if (!configKey || !configValue) {
      return res.status(400).json({ success: false, error: '配置键和配置值不能为空' });
    }

    const id = `CFG${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO system_configs (id, config_key, config_value, config_type, category, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [id, configKey, configValue, configType || 'string', category || 'system', description || '', now, now]);

    // 查询完整记录返回
    const created = db.exec(`SELECT * FROM system_configs WHERE id = ?`, [id]);
    if (created.length > 0 && created[0].values.length > 0) {
      const cols = created[0].columns;
      const row = created[0].values[0];
      const full: any = {};
      cols.forEach((c, i) => { full[c] = row[i]; });
      res.json({ success: true, message: '系统配置创建成功', data: full });
    } else {
      res.json({ success: true, message: '系统配置创建成功', data: { id, configKey, configValue } });
    }
  } catch (error) {
    console.error('创建系统配置失败:', error);
    res.status(500).json({ success: false, error: '创建系统配置失败' });
  }
});

/**
 * 更新系统配置
 * PUT /api/basic-data/system-configs/:id
 */
router.put('/system-configs/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { configKey, configValue, configType, category, description, isActive } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE system_configs
      SET config_key = COALESCE(?, config_key),
          config_value = COALESCE(?, config_value),
          config_type = COALESCE(?, config_type),
          category = COALESCE(?, category),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active),
          updated_at = ?
      WHERE id = ?
    `, [configKey, configValue, configType, category, description, isActive, now, id]);

    res.json({ success: true, message: '系统配置更新成功' });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({ success: false, error: '更新系统配置失败' });
  }
});

/**
 * 删除系统配置（软删除）
 * DELETE /api/basic-data/system-configs/:id
 */
router.delete('/system-configs/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE system_configs SET is_active = 0, updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: '系统配置删除成功' });
  } catch (error) {
    console.error('删除系统配置失败:', error);
    res.status(500).json({ success: false, error: '删除系统配置失败' });
  }
});

/**
 * 获取所有工序定义
 * GET /api/basic-data/process-definitions
 */
router.get('/process-definitions', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, process_code, process_name, process_type, unit, default_price, default_bonus, description, status, created_at, updated_at
      FROM process_definitions
      WHERE status = 'active'
      ORDER BY process_code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const items = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取工序定义失败:', error);
    res.status(500).json({ success: false, error: '获取工序定义失败' });
  }
});

/**
 * 创建工序定义
 * POST /api/basic-data/process-definitions
 */
router.post('/process-definitions', (req, res) => {
  try {
    const db = getDatabase();
    const { processCode, processName, processType, unit, defaultPrice, defaultBonus, description } = req.body;

    if (!processCode || !processName) {
      return res.status(400).json({ success: false, error: '工序编码和名称不能为空' });
    }

    const oid = `PD${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO process_definitions (oid, process_code, process_name, process_type, unit, default_price, default_bonus, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [oid, processCode, processName, processType || '', unit || '亩', defaultPrice || 0, defaultBonus || 0, description || '', now, now]);

    res.json({ success: true, message: '工序定义创建成功', data: { oid, processCode, processName } });
  } catch (error) {
    console.error('创建工序定义失败:', error);
    res.status(500).json({ success: false, error: '创建工序定义失败' });
  }
});

/**
 * 更新工序定义
 * PUT /api/basic-data/process-definitions/:id
 */
router.put('/process-definitions/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { processCode, processName, processType, unit, defaultPrice, defaultBonus, description, status } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE process_definitions
      SET process_code = COALESCE(?, process_code),
          process_name = COALESCE(?, process_name),
          process_type = COALESCE(?, process_type),
          unit = COALESCE(?, unit),
          default_price = COALESCE(?, default_price),
          default_bonus = COALESCE(?, default_bonus),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [processCode, processName, processType, unit, defaultPrice, defaultBonus, description, status, now, id]);

    res.json({ success: true, message: '工序定义更新成功' });
  } catch (error) {
    console.error('更新工序定义失败:', error);
    res.status(500).json({ success: false, error: '更新工序定义失败' });
  }
});

/**
 * 删除工序定义（软删除）
 * DELETE /api/basic-data/process-definitions/:id
 */
router.delete('/process-definitions/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE process_definitions SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: '工序定义删除成功' });
  } catch (error) {
    console.error('删除工序定义失败:', error);
    res.status(500).json({ success: false, error: '删除工序定义失败' });
  }
});

// ============================================
// 分级审批 — 审批级别配置 API
// ============================================

/**
 * 获取所有审批级别配置
 * GET /api/basic-data/approval-level-configs
 */
router.get('/approval-level-configs', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, level_code, level_name, description, approver_count, require_multi_approver, approver_roles, sort_order, status, created_at, updated_at
      FROM approval_level_configs
      WHERE status = 'active'
      ORDER BY sort_order
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const items = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        let val = row[i];
        // 解析 JSON 字段
        if (col === 'approver_roles' && val) {
          try { val = JSON.parse(String(val)); } catch (e) { /* keep as string */ }
        }
        obj[camelCol] = val;
      });
      return obj;
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取审批级别配置失败:', error);
    res.status(500).json({ success: false, error: '获取审批级别配置失败' });
  }
});

/**
 * 更新审批级别配置
 * PUT /api/basic-data/approval-level-configs/:id
 */
router.put('/approval-level-configs/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { levelName, description, approverCount, requireMultiApprover, approverRoles, status } = req.body;
    const now = new Date().toISOString();

    const rolesJson = approverRoles ? JSON.stringify(approverRoles) : undefined;

    db.run(`
      UPDATE approval_level_configs
      SET level_name = COALESCE(?, level_name),
          description = COALESCE(?, description),
          approver_count = COALESCE(?, approver_count),
          require_multi_approver = COALESCE(?, require_multi_approver),
          approver_roles = COALESCE(?, approver_roles),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [levelName, description, approverCount, requireMultiApprover, rolesJson, status, now, id]);

    res.json({ success: true, message: '审批级别配置更新成功' });
  } catch (error) {
    console.error('更新审批级别配置失败:', error);
    res.status(500).json({ success: false, error: '更新审批级别配置失败' });
  }
});

// ============================================
// 分级审批 — 审批金额阈值 API
// ============================================

/**
 * 获取所有金额阈值配置
 * GET /api/basic-data/approval-amount-thresholds
 */
router.get('/approval-amount-thresholds', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, max_amount, level_code, sort_order, status, created_at, updated_at
      FROM approval_amount_thresholds
      WHERE status = 'active'
      ORDER BY sort_order
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const items = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取金额阈值失败:', error);
    res.status(500).json({ success: false, error: '获取金额阈值失败' });
  }
});

/**
 * 创建金额阈值
 * POST /api/basic-data/approval-amount-thresholds
 */
router.post('/approval-amount-thresholds', (req, res) => {
  try {
    const db = getDatabase();
    const { maxAmount, levelCode, sortOrder } = req.body;

    if (!maxAmount || !levelCode) {
      return res.status(400).json({ success: false, error: '金额上限和审批级别不能为空' });
    }

    const oid = `AAT${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO approval_amount_thresholds (oid, max_amount, level_code, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `, [oid, maxAmount, levelCode, sortOrder || 0, now, now]);

    res.json({ success: true, message: '金额阈值创建成功', data: { oid, maxAmount, levelCode } });
  } catch (error) {
    console.error('创建金额阈值失败:', error);
    res.status(500).json({ success: false, error: '创建金额阈值失败' });
  }
});

/**
 * 更新金额阈值
 * PUT /api/basic-data/approval-amount-thresholds/:id
 */
router.put('/approval-amount-thresholds/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { maxAmount, levelCode, sortOrder, status } = req.body;
    const now = new Date().toISOString();

    db.run(`
      UPDATE approval_amount_thresholds
      SET max_amount = COALESCE(?, max_amount),
          level_code = COALESCE(?, level_code),
          sort_order = COALESCE(?, sort_order),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [maxAmount, levelCode, sortOrder, status, now, id]);

    res.json({ success: true, message: '金额阈值更新成功' });
  } catch (error) {
    console.error('更新金额阈值失败:', error);
    res.status(500).json({ success: false, error: '更新金额阈值失败' });
  }
});

/**
 * 删除金额阈值（软删除）
 * DELETE /api/basic-data/approval-amount-thresholds/:id
 */
router.delete('/approval-amount-thresholds/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();
    db.run(`UPDATE approval_amount_thresholds SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, id]);
    res.json({ success: true, message: '金额阈值删除成功' });
  } catch (error) {
    console.error('删除金额阈值失败:', error);
    res.status(500).json({ success: false, error: '删除金额阈值失败' });
  }
});

// ============================================
// 分级审批 — 审批类型规则 API
// ============================================

/**
 * 获取所有审批类型规则
 * GET /api/basic-data/approval-type-rules
 */
router.get('/approval-type-rules', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, approval_type, force_exempt, force_strict, forced_level, batch_approval_supported, custom_approver_count, remark, status, created_at, updated_at
      FROM approval_type_rules
      WHERE status = 'active'
      ORDER BY id
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const items = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取审批类型规则失败:', error);
    res.status(500).json({ success: false, error: '获取审批类型规则失败' });
  }
});

/**
 * 更新审批类型规则
 * PUT /api/basic-data/approval-type-rules/:id
 */
router.put('/approval-type-rules/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { forceExempt, forceStrict, forcedLevel, batchApprovalSupported, customApproverCount, remark, status } = req.body;
    const now = new Date().toISOString();

    db.run(`
      UPDATE approval_type_rules
      SET force_exempt = COALESCE(?, force_exempt),
          force_strict = COALESCE(?, force_strict),
          forced_level = COALESCE(?, forced_level),
          batch_approval_supported = COALESCE(?, batch_approval_supported),
          custom_approver_count = COALESCE(?, custom_approver_count),
          remark = COALESCE(?, remark),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [forceExempt, forceStrict, forcedLevel, batchApprovalSupported, customApproverCount, remark, status, now, id]);

    res.json({ success: true, message: '审批类型规则更新成功' });
  } catch (error) {
    console.error('更新审批类型规则失败:', error);
    res.status(500).json({ success: false, error: '更新审批类型规则失败' });
  }
});

// ============================================
// 班次管理 API
// ============================================

/**
 * 获取所有班次
 * GET /api/basic-data/shifts
 */
router.get('/shifts', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, shift_code, shift_name, start_time, end_time, shift_type, description, status, created_at, updated_at
      FROM shifts
      WHERE status != 'deleted'
      ORDER BY start_time
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const shifts = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: shifts });
  } catch (error) {
    console.error('获取班次失败:', error);
    res.status(500).json({ success: false, error: '获取班次失败' });
  }
});

/**
 * 创建班次
 * POST /api/basic-data/shifts
 */
router.post('/shifts', (req, res) => {
  try {
    const db = getDatabase();
    const { shiftCode, shiftName, startTime, endTime, shiftType, description, status } = req.body;

    if (!shiftCode || !shiftName || !startTime || !endTime) {
      return res.status(400).json({ success: false, error: '班次编码、名称、开始时间和结束时间不能为空' });
    }

    const oid = `SH${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO shifts (oid, shift_code, shift_name, start_time, end_time, shift_type, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [oid, shiftCode, shiftName, startTime, endTime, shiftType || '早班', description || '', status || 'active', now, now]);

    const created = db.exec(`SELECT id, oid, shift_code, shift_name, start_time, end_time, shift_type, description, status, created_at, updated_at FROM shifts WHERE oid = ?`, [oid]);
    if (created.length > 0 && created[0].values.length > 0) {
      const columns = created[0].columns;
      const row = created[0].values[0];
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return res.json({ success: true, message: '班次创建成功', data: obj });
    }

    res.json({ success: true, message: '班次创建成功' });
  } catch (error) {
    console.error('创建班次失败:', error);
    res.status(500).json({ success: false, error: '创建班次失败' });
  }
});

/**
 * 更新班次
 * PUT /api/basic-data/shifts/:id
 */
router.put('/shifts/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { shiftCode, shiftName, startTime, endTime, shiftType, description, status } = req.body;
    const now = new Date().toISOString();

    db.run(`
      UPDATE shifts
      SET shift_code = COALESCE(?, shift_code),
          shift_name = COALESCE(?, shift_name),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          shift_type = COALESCE(?, shift_type),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `, [shiftCode, shiftName, startTime, endTime, shiftType, description, status, now, id]);

    res.json({ success: true, message: '班次更新成功' });
  } catch (error) {
    console.error('更新班次失败:', error);
    res.status(500).json({ success: false, error: '更新班次失败' });
  }
});

/**
 * 删除班次（软删除）
 * DELETE /api/basic-data/shifts/:id
 */
router.delete('/shifts/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const now = new Date().toISOString();

    db.run(`UPDATE shifts SET status = 'deleted', updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: '班次删除成功' });
  } catch (error) {
    console.error('删除班次失败:', error);
    res.status(500).json({ success: false, error: '删除班次失败' });
  }
});

// ============================================
// 成本类别管理 API
// ============================================

router.get('/cost-categories', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, category_code, category_name, category_type, unit, description, status, created_at, updated_at
      FROM cost_categories
      WHERE status != 'deleted'
      ORDER BY category_code
    `);

    if (result.length === 0) return res.json({ success: true, data: [] });

    const columns = result[0].columns;
    const items = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取成本类别失败:', error);
    res.status(500).json({ success: false, error: '获取成本类别失败' });
  }
});

router.post('/cost-categories', (req, res) => {
  try {
    const db = getDatabase();
    const { categoryCode, categoryName, categoryType, unit, description, status } = req.body;
    if (!categoryCode || !categoryName) {
      return res.status(400).json({ success: false, error: '类别编码和名称不能为空' });
    }
    const oid = `CC${Date.now()}`;
    const now = new Date().toISOString();
    db.run(`
      INSERT INTO cost_categories (oid, category_code, category_name, category_type, unit, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [oid, categoryCode, categoryName, categoryType || 'other', unit || '元', description || '', status || 'active', now, now]);

    const created = db.exec(`SELECT * FROM cost_categories WHERE oid = ?`, [oid]);
    if (created.length > 0 && created[0].values.length > 0) {
      const cols = created[0].columns;
      const row = created[0].values[0];
      const obj: any = {};
      cols.forEach((col, i) => { obj[col.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] = row[i]; });
      return res.json({ success: true, message: '成本类别创建成功', data: obj });
    }
    res.json({ success: true, message: '成本类别创建成功' });
  } catch (error) {
    console.error('创建成本类别失败:', error);
    res.status(500).json({ success: false, error: '创建成本类别失败' });
  }
});

router.put('/cost-categories/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { categoryCode, categoryName, categoryType, unit, description, status } = req.body;
    const now = new Date().toISOString();
    db.run(`
      UPDATE cost_categories
      SET category_code = COALESCE(?, category_code), category_name = COALESCE(?, category_name),
          category_type = COALESCE(?, category_type), unit = COALESCE(?, unit),
          description = COALESCE(?, description), status = COALESCE(?, status), updated_at = ?
      WHERE id = ?
    `, [categoryCode, categoryName, categoryType, unit, description, status, now, id]);
    res.json({ success: true, message: '成本类别更新成功' });
  } catch (error) {
    console.error('更新成本类别失败:', error);
    res.status(500).json({ success: false, error: '更新成本类别失败' });
  }
});

router.delete('/cost-categories/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    db.run(`UPDATE cost_categories SET status = 'deleted', updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
    res.json({ success: true, message: '成本类别删除成功' });
  } catch (error) {
    console.error('删除成本类别失败:', error);
    res.status(500).json({ success: false, error: '删除成本类别失败' });
  }
});

// ============================================
// 成本预算管理 API
// ============================================

router.get('/cost-budgets', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT b.id, b.oid, b.budget_name, b.category_oid, b.budget_year, b.budget_month,
             b.budget_amount, b.used_amount, b.status, b.created_at, b.updated_at,
             c.category_name, c.category_code
      FROM cost_budgets b
      LEFT JOIN cost_categories c ON b.category_oid = c.oid
      WHERE b.status != 'deleted'
      ORDER BY b.budget_year DESC, b.budget_month DESC
    `);

    if (result.length === 0) return res.json({ success: true, data: [] });

    const columns = result[0].columns;
    const items = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取成本预算失败:', error);
    res.status(500).json({ success: false, error: '获取成本预算失败' });
  }
});

router.post('/cost-budgets', (req, res) => {
  try {
    const db = getDatabase();
    const { budgetName, categoryOid, budgetYear, budgetMonth, budgetAmount, usedAmount, status } = req.body;
    if (!budgetName || !categoryOid || !budgetYear) {
      return res.status(400).json({ success: false, error: '预算名称、类别和年份不能为空' });
    }
    const oid = `CB${Date.now()}`;
    const now = new Date().toISOString();
    db.run(`
      INSERT INTO cost_budgets (oid, budget_name, category_oid, budget_year, budget_month, budget_amount, used_amount, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [oid, budgetName, categoryOid, budgetYear, budgetMonth || null, budgetAmount || 0, usedAmount || 0, status || 'active', now, now]);

    const created = db.exec(`
      SELECT b.*, c.category_name, c.category_code FROM cost_budgets b
      LEFT JOIN cost_categories c ON b.category_oid = c.oid WHERE b.oid = ?
    `, [oid]);
    if (created.length > 0 && created[0].values.length > 0) {
      const cols = created[0].columns;
      const row = created[0].values[0];
      const obj: any = {};
      cols.forEach((col, i) => { obj[col.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] = row[i]; });
      return res.json({ success: true, message: '预算创建成功', data: obj });
    }
    res.json({ success: true, message: '预算创建成功' });
  } catch (error) {
    console.error('创建预算失败:', error);
    res.status(500).json({ success: false, error: '创建预算失败' });
  }
});

router.put('/cost-budgets/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { budgetName, categoryOid, budgetYear, budgetMonth, budgetAmount, usedAmount, status } = req.body;
    const now = new Date().toISOString();
    db.run(`
      UPDATE cost_budgets
      SET budget_name = COALESCE(?, budget_name), category_oid = COALESCE(?, category_oid),
          budget_year = COALESCE(?, budget_year), budget_month = COALESCE(?, budget_month),
          budget_amount = COALESCE(?, budget_amount), used_amount = COALESCE(?, used_amount),
          status = COALESCE(?, status), updated_at = ?
      WHERE id = ?
    `, [budgetName, categoryOid, budgetYear, budgetMonth, budgetAmount, usedAmount, status, now, id]);
    res.json({ success: true, message: '预算更新成功' });
  } catch (error) {
    console.error('更新预算失败:', error);
    res.status(500).json({ success: false, error: '更新预算失败' });
  }
});

router.delete('/cost-budgets/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    db.run(`UPDATE cost_budgets SET status = 'deleted', updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
    res.json({ success: true, message: '预算删除成功' });
  } catch (error) {
    console.error('删除预算失败:', error);
    res.status(500).json({ success: false, error: '删除预算失败' });
  }
});

// ========== 物料类型 CRUD ==========
router.get('/material-types', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`SELECT * FROM material_types WHERE status != 'deleted' ORDER BY id`);
    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const items = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj;
    });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取物料类型失败:', error);
    res.status(500).json({ success: false, error: '获取物料类型失败' });
  }
});

router.post('/material-types', (req, res) => {
  try {
    const db = getDatabase();
    const { typeCode, typeName, category, defaultUnit, defaultPrice, specifications, description, status } = req.body;
    if (!typeCode || !typeName) {
      return res.status(400).json({ success: false, error: '物料编码和名称不能为空' });
    }
    const oid = `MT${Date.now()}`;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO material_types (oid, type_code, type_name, category, default_unit, default_price, specifications, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [oid, typeCode, typeName, category || null, defaultUnit || null, defaultPrice || 0, specifications || null, description || null, status || 'active', now, now]
    );
    const result = db.exec(`SELECT * FROM material_types WHERE oid = ?`, [oid]);
    const columns = result[0].columns;
    const created: any = {};
    columns.forEach((col, i) => {
      const camelCol = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      created[camelCol] = result[0].values[0][i];
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('创建物料类型失败:', error);
    res.status(500).json({ success: false, error: '创建物料类型失败' });
  }
});

router.put('/material-types/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const fields = ['type_code', 'type_name', 'category', 'default_unit', 'default_price', 'specifications', 'description', 'status'];
    const camelToSnake: Record<string, string> = {
      typeCode: 'type_code', typeName: 'type_name', defaultUnit: 'default_unit', defaultPrice: 'default_price',
    };
    const setClauses: string[] = [];
    const values: any[] = [];
    Object.entries(req.body).forEach(([k, v]) => {
      const col = camelToSnake[k] || k.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (fields.includes(col)) {
        setClauses.push(`${col} = COALESCE(?, ${col})`);
        values.push(v);
      }
    });
    if (setClauses.length === 0) return res.status(400).json({ success: false, error: '无有效字段' });
    setClauses.push(`updated_at = ?`);
    values.push(new Date().toISOString());
    values.push(parseInt(id));
    db.run(`UPDATE material_types SET ${setClauses.join(', ')} WHERE id = ?`, values);
    const result = db.exec(`SELECT * FROM material_types WHERE id = ?`, [parseInt(id)]);
    const columns = result[0].columns;
    const updated: any = {};
    columns.forEach((col, i) => {
      const camelCol = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      updated[camelCol] = result[0].values[0][i];
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('更新物料类型失败:', error);
    res.status(500).json({ success: false, error: '更新物料类型失败' });
  }
});

router.delete('/material-types/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    db.run(`UPDATE material_types SET status = 'deleted', updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
    res.json({ success: true, message: '物料类型删除成功' });
  } catch (error) {
    console.error('删除物料类型失败:', error);
    res.status(500).json({ success: false, error: '删除物料类型失败' });
  }
});

// ============================================================
// 基地（Bases）路由 — 基地空间架构 V1.0
// ============================================================

/** 获取所有基地 GET /api/basic-data/bases */
router.get('/bases', (req, res) => {
  try {
    const db = getDatabase();
    const { company_oid } = req.query;
    let sql = 'SELECT * FROM bases WHERE deleted_at IS NULL';
    const params: any[] = [];
    if (company_oid) {
      sql += ' AND company_oid = ?';
      params.push(company_oid);
    }
    sql += ' ORDER BY created_at DESC';
    const result = db.exec(sql, params);

    if (result.length === 0) return res.json({ success: true, data: [] });

    const columns = result[0].columns;
    const bases = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: bases });
  } catch (error) {
    console.error('获取基地列表失败:', error);
    res.status(500).json({ success: false, error: '获取基地列表失败' });
  }
});

/** 获取单个基地 GET /api/basic-data/bases/:oid */
router.get('/bases/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM bases WHERE oid = ? AND deleted_at IS NULL', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '基地不存在' });
    }
    const columns = result[0].columns;
    const base: any = {};
    columns.forEach((col, i) => { base[col] = result[0].values[0][i]; });
    res.json({ success: true, data: base });
  } catch (error) {
    console.error('获取基地详情失败:', error);
    res.status(500).json({ success: false, error: '获取基地详情失败' });
  }
});

/** 创建基地 POST /api/basic-data/bases */
router.post('/bases', (req, res) => {
  try {
    const db = getDatabase();
    const { name, companyOid, companyName, code, area, unit, province, city, lng, lat, manager, phone, soilType, ph, intro } = req.body;
    if (!name || !companyOid) {
      return res.status(400).json({ success: false, error: '基地名称和所属公司不能为空' });
    }
    const oid = `base_${Date.now()}`;
    const now = new Date().toISOString();
    db.run(`
      INSERT INTO bases (oid, code, name, company_oid, company_name, area, unit, province, city, lng, lat, manager, phone, soil_type, ph, intro, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [oid, code || '', name, companyOid, companyName || '', area || 0, unit || '亩', province || '', city || '', lng || 0, lat || 0, manager || '', phone || '', soilType || '', ph || 0, intro || '', now, now]);

    const result = db.exec('SELECT * FROM bases WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const base: any = {};
    columns.forEach((col, i) => { base[col] = result[0].values[0][i]; });
    res.json({ success: true, data: base, message: '基地创建成功' });
  } catch (error) {
    console.error('创建基地失败:', error);
    res.status(500).json({ success: false, error: '创建基地失败' });
  }
});

/** 批量迁移基地（从 localStorage） POST /api/basic-data/bases/migrate */
router.post('/bases/migrate', (req, res) => {
  try {
    const db = getDatabase();
    const { companyGroups } = req.body;
    if (!Array.isArray(companyGroups)) {
      return res.status(400).json({ success: false, error: '数据格式错误' });
    }
    const now = new Date().toISOString();
    let createdCount = 0;
    db.run('BEGIN TRANSACTION');
    try {
      for (const company of companyGroups) {
        const companyOid = `company_${company.id}`;
        const companyName = company.name;
        for (const base of company.bases || []) {
          const baseOid = `base_${base.id}`;
          // 检查是否已存在
          const check = db.exec('SELECT COUNT(*) as cnt FROM bases WHERE oid = ?', [baseOid]);
          const cnt = check[0]?.values[0]?.[0] || 0;
          if (Number(cnt) > 0) continue;
          db.run(`
            INSERT INTO bases (oid, code, name, company_oid, company_name, area, unit, province, city, lng, lat, manager, phone, soil_type, ph, intro, greenhouse_count, field_area, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
          `, [baseOid, `BASE_${base.id}`, base.name, companyOid, companyName,
              base.area || 0, base.unit || '亩', base.province || '', base.city || '',
              base.lng || 0, base.lat || 0, base.manager || '', base.phone || '',
              base.soilType || '', base.ph || 0, base.intro || '',
              base.greenhouseCount || 0, base.fieldArea || 0, now, now]);
          createdCount++;
        }
      }
      db.run('COMMIT');
      res.json({ success: true, message: `迁移完成，共创建 ${createdCount} 条基地记录`, count: createdCount });
    } catch (txErr) {
      db.run('ROLLBACK');
      throw txErr;
    }
  } catch (error) {
    console.error('基地迁移失败:', error);
    res.status(500).json({ success: false, error: '基地迁移失败' });
  }
});

/** 更新基地 PUT /api/basic-data/bases/:oid */
router.put('/bases/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const { name, code, companyOid, companyName, area, unit, province, city, lng, lat, manager, phone, soilType, ph, intro, status } = req.body;
    const setClauses: string[] = [];
    const values: any[] = [];
    const fields: Record<string, string> = {
      name, code, company_name: companyName, company_oid: companyOid,
      area, unit, province, city, lng, lat, manager, phone,
      soil_type: soilType, ph, intro, status,
    };
    Object.entries(fields).forEach(([col, val]) => {
      if (val !== undefined) {
        setClauses.push(`${col} = ?`);
        values.push(val);
      }
    });
    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: '没有提供需要更新的字段' });
    }
    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.oid);
    db.run(`UPDATE bases SET ${setClauses.join(', ')} WHERE oid = ? AND deleted_at IS NULL`, values);

    const result = db.exec('SELECT * FROM bases WHERE oid = ?', [req.params.oid]);
    const columns = result[0].columns;
    const base: any = {};
    columns.forEach((col, i) => { base[col] = result[0].values[0][i]; });
    res.json({ success: true, data: base, message: '基地更新成功' });
  } catch (error) {
    console.error('更新基地失败:', error);
    res.status(500).json({ success: false, error: '更新基地失败' });
  }
});

/** 删除基地（软删除） DELETE /api/basic-data/bases/:oid */
router.delete('/bases/:oid', (req, res) => {
  try {
    const db = getDatabase();
    db.run('UPDATE bases SET deleted_at = ?, updated_at = ? WHERE oid = ?', [new Date().toISOString(), new Date().toISOString(), req.params.oid]);
    res.json({ success: true, message: '基地已删除' });
  } catch (error) {
    console.error('删除基地失败:', error);
    res.status(500).json({ success: false, error: '删除基地失败' });
  }
});

export default router;
