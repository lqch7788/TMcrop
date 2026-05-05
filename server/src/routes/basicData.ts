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
      SELECT id, oid, code, name, manager_id, manager_name, parent_oid, sort_number, status, created_at
      FROM departments
      WHERE status = 'active'
      ORDER BY sort_number
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
      FROM sys_dictionary_categories
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
             d.next_maintenance_date, d.description, d.created_at,
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
             d.next_maintenance_date, d.description, d.created_at,
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

    res.json({ success: true, message: '系统配置创建成功', data: { id, configKey, configValue } });
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

export default router;
