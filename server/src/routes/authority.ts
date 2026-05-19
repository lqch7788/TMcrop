/**
 * 组织与权限管理 API 路由
 * 来源参考：弘智耘源 authority2 模块
 * 创建日期：2026-05-02
 */

import { Router } from 'express';
import { getDatabase, saveDatabase } from '../db';
import bcrypt from 'bcryptjs';
import { generateToken, authenticate } from '../middleware/auth';

const router = Router();

// ============================================
// 登录接口
// ============================================

/**
 * 用户登录
 * POST /api/authority/login
 * 请求体: { username: string, password: string }
 * 返回: { success: true, token: string, user: { oid, username, name, ... } }
 */
router.post('/login', (req, res) => {
  const db = getDatabase();
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: '请提供账号和密码' });
    return;
  }

  try {
    // 查询用户（使用 username 作为登录账号）
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?');
    stmt.bind([username, 'active']);

    if (stmt.step()) {
      const user = stmt.getAsObject() as Record<string, unknown>;
      stmt.free();

      // 使用 bcrypt 验证密码
      const storedPasswordHash = user.password_hash as string;
      const isPasswordValid = bcrypt.compareSync(password, storedPasswordHash);

      if (!isPasswordValid) {
        res.status(401).json({ success: false, error: '账号或密码错误' });
        return;
      }

      // 生成 JWT token
      const token = generateToken({
        userId: user.oid as string,
        aid: user.username as string,
        name: (user.real_name || user.username) as string,
      });

      // 去除密码哈希后返回用户信息
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        token,
        user: {
          oid: userWithoutPassword.oid,
          aid: userWithoutPassword.username,
          name: userWithoutPassword.real_name || userWithoutPassword.username,
          email: userWithoutPassword.email,
          phone: userWithoutPassword.phone,
          org_oid: userWithoutPassword.org_oid,
          status: userWithoutPassword.status,
        },
      });
    } else {
      stmt.free();
      res.status(401).json({ success: false, error: '账号或密码错误' });
    }
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, error: '登录失败' });
  }
});

/**
 * 验证 token 有效性
 * GET /api/authority/verify
 * 需要认证
 */
router.get('/verify', authenticate, (req, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' });
    return;
  }
  res.json({
    success: true,
    user: {
      userId: req.user.userId,
      aid: req.user.aid,
      name: req.user.name,
    }
  });
});

// ============================================
// 组织管理
// ============================================

/**
 * 获取组织树
 */
router.get('/organizations', (req, res) => {
  const db = getDatabase();
  const { rows = -1, id, sort = 'sort_order', order = 'asc' } = req.query;

  let sql = 'SELECT * FROM organizations WHERE status = ?';
  const bindings: (string | number)[] = ['active'];

  if (!id) {
    sql += ' AND parent_oid IS NULL';
  } else {
    sql += ' AND parent_oid = ?';
    bindings.push(id as string);
  }

  // ORDER BY 白名单验证，防止 SQL 注入
  const allowedSorts = ['sort_order', 'name', 'oid', 'created_at', 'status'];
  const allowedOrders = ['asc', 'desc'];
  const safeSort = allowedSorts.includes(sort as string) ? sort : 'sort_order';
  const safeOrder = allowedOrders.includes((order as string).toLowerCase()) ? (order as string).toLowerCase() : 'asc';
  sql += ` ORDER BY ${safeSort} ${safeOrder}`;

  if (Number(rows) > 0) {
    sql += ' LIMIT ?';
    bindings.push(Number(rows));
  }

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    // 递归加载子节点
    const loadChildren = (nodes: Record<string, unknown>[]): Record<string, unknown>[] => {
      return nodes.map(node => {
        const childrenSql = 'SELECT * FROM organizations WHERE status = ? AND parent_oid = ?';
        const childStmt = db.prepare(childrenSql);
        childStmt.bind(['active', node.oid as string]);
        const children: Record<string, unknown>[] = [];
        while (childStmt.step()) {
          children.push(childStmt.getAsObject());
        }
        childStmt.free();
        if (children.length > 0) {
          (node as Record<string, unknown>).children = loadChildren(children);
        }
        return node;
      });
    };

    res.json(loadChildren(results));
  } catch (error) {
    console.error('获取组织树失败:', error);
    res.status(500).json({ error: '获取组织树失败' });
  }
});

/**
 * 保存组织（新增或更新）- 需要认证
 */
router.post('/organizations', authenticate, (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    // 处理新增
    if (inserted && inserted.length > 0) {
      for (const org of inserted) {
        const oid = org.oid || `ORG_${Date.now()}`;
        const id = `ORG_ID_${Date.now()}`;
        const orgType = org.orgType || 'department';
        // 部门类型自动生成 departmentId（如未提供），确保双向同步
        const departmentId = org.departmentId || (orgType === 'department' ? `DEPT_${Date.now()}` : null);
        const departmentName = org.departmentName || org.name || null;

        db.run(
          `INSERT INTO organizations (id, oid, parent_oid, aid, name, description, address,
            contact_person, contact_phone,
            org_type, sort_order, status, department_id, department_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            oid,
            org.oidParent || null,
            org.aid,
            org.name,
            org.description || null,
            org.address || null,
            org.contactor || org.contactPerson || null,
            org.contactorPhone || org.contactPhone || null,
            orgType,
            org.sortNumber || 0,
            'active',
            departmentId,
            departmentName,
            now,
            now
          ]
        );

        // 双向同步：部门类型组织自动创建对应的部门记录
        if (orgType === 'department' && departmentId) {
          const deptNow = new Date().toISOString();
          db.run(`
            INSERT OR IGNORE INTO departments (id, oid, name, code, parent_oid, manager_id, manager_name, sort_number, description, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
          `, [
            departmentId,
            departmentId,
            org.name,
            departmentId,
            org.oidParent || '',
            '',
            org.contactor || org.contactPerson || '',
            0,
            org.description || '',
            deptNow,
            deptNow
          ]);
        }

        results.inserted.push({ oid, ...org });
      }
    }

    // 处理更新
    if (updated && updated.length > 0) {
      for (const org of updated) {
        db.run(
          `UPDATE organizations SET
            parent_oid = ?, aid = ?, name = ?, description = ?, address = ?,
            contact_person = ?, contact_phone = ?,
            org_type = ?, sort_order = ?, department_id = COALESCE(?, department_id),
            department_name = COALESCE(?, department_name),
            updated_at = ?
           WHERE oid = ?`,
          [
            org.oidParent || null,
            org.aid,
            org.name,
            org.description || null,
            org.address || null,
            org.contactor || org.contactPerson || null,
            org.contactorPhone || org.contactPhone || null,
            org.orgType || 'department',
            org.sortNumber || 0,
            org.departmentId || null,
            org.departmentName || null,
            now,
            org.oid
          ]
        );

        // 双向同步：部门类型组织同步更新部门表
        const orgType = org.orgType || 'department';
        if (orgType === 'department') {
          // 查询当前 department_id（可能已被上方 UPDATE 设置或原本就存在）
          const checkStmt = db.prepare('SELECT department_id FROM organizations WHERE oid = ?');
          checkStmt.bind([org.oid]);
          let currentDeptId: string | null = null;
          if (checkStmt.step()) {
            currentDeptId = (checkStmt.getAsObject()).department_id as string | null;
          }
          checkStmt.free();

          // 如果还没有 department_id，自动生成并回填
          if (!currentDeptId) {
            currentDeptId = `DEPT_${Date.now()}`;
            db.run(`UPDATE organizations SET department_id = ?, department_name = ? WHERE oid = ?`, [currentDeptId, org.name, org.oid]);
            // 创建对应部门记录
            db.run(`
              INSERT OR IGNORE INTO departments (id, oid, name, code, parent_oid, manager_id, manager_name, sort_number, description, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            `, [currentDeptId, currentDeptId, org.name, currentDeptId, org.oidParent || '', '', org.contactor || org.contactPerson || '', 0, org.description || '', now, now]);
          } else {
            // 已有 department_id，检查部门是否存在
            const deptCheck = db.prepare('SELECT 1 FROM departments WHERE id = ?');
            deptCheck.bind([currentDeptId]);
            const deptExists = deptCheck.step();
            deptCheck.free();

            if (deptExists) {
              // 部门存在，同步更新
              db.run(`
                UPDATE departments
                SET name = COALESCE(?, name),
                    manager_name = COALESCE(?, manager_name),
                    updated_at = ?
                WHERE id = ? AND status = 'active'
              `, [
                org.name || null,
                org.contactor || org.contactPerson || null,
                now,
                currentDeptId
              ]);
            } else {
              // 部门不存在，创建新部门记录
              db.run(`
                INSERT INTO departments (id, oid, name, code, parent_oid, manager_id, manager_name, sort_number, description, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
              `, [currentDeptId, currentDeptId, org.name, currentDeptId, org.oidParent || '', '', org.contactor || org.contactPerson || '', 0, org.description || '', now, now]);
            }
          }
        }

        results.updated.push(org);
      }
    }

    // 处理删除
    if (deleted && deleted.length > 0) {
      for (const item of deleted) {
        // 兼容两种格式：纯字符串 oid 或 { oid: string } 对象
        const oid = typeof item === 'string' ? item : (item as Record<string, unknown>).oid as string;
        if (!oid) continue;

        // 删除前查询关联的部门ID，用于双向同步
        const orgStmt = db.prepare('SELECT department_id FROM organizations WHERE oid = ?');
        orgStmt.bind([oid]);
        let linkedDeptId: string | null = null;
        if (orgStmt.step()) {
          const row = orgStmt.getAsObject();
          linkedDeptId = row.department_id as string | null;
        }
        orgStmt.free();

        db.run('DELETE FROM organizations WHERE oid = ?', [oid]);

        // 双向同步：同步软删除关联的部门
        if (linkedDeptId) {
          db.run(`UPDATE departments SET status = 'inactive', updated_at = ? WHERE id = ?`, [now, linkedDeptId]);
        }

        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存组织失败:', error);
    res.status(500).json({ error: '保存组织失败' });
  }
});

// ============================================
// 角色管理
// ============================================

/**
 * 获取角色列表
 */
router.get('/roles', (req, res) => {
  const db = getDatabase();
  const { sort = 'created_at', order = 'desc' } = req.query;

  let sql = 'SELECT * FROM roles WHERE status = ?';
  const bindings: string[] = ['active'];

  // 安全检查：只允许特定的排序列和排序方向
  const allowedSorts = ['created_at', 'role_name', 'oid'];
  const allowedOrders = ['asc', 'desc'];
  const safeSort = allowedSorts.includes(sort as string) ? sort : 'created_at';
  const safeOrder = allowedOrders.includes((order as string).toLowerCase()) ? (order as string).toLowerCase() : 'asc';
  sql += ` ORDER BY ${safeSort} ${safeOrder}`;

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      const role = stmt.getAsObject();
      // 字段映射：数据库字段 -> 前端期望字段
      // 数据库: role_code -> 前端: aid
      // 数据库: role_name -> 前端: name
      (role as Record<string, unknown>).aid = role.role_code;
      (role as Record<string, unknown>).name = role.role_name;
      results.push(role);
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ error: '获取角色列表失败' });
  }
});

/**
 * 保存角色 - 需要认证
 */
router.post('/roles', authenticate, (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    if (inserted && inserted.length > 0) {
      for (const role of inserted) {
        const oid = role.oid || `ROLE_${Date.now()}`;
        const id = `ROLE_ID_${Date.now()}`;
        // roles 表字段: id, oid, role_code, role_name, description, is_system, status, created_at, updated_at
        db.run(
          `INSERT INTO roles (id, oid, role_code, role_name, description, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            oid,
            role.aid || oid,  // role_code 使用 aid 或 oid
            role.name,       // role_name
            role.description || null,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ oid, ...role });
      }
    }

    if (updated && updated.length > 0) {
      for (const role of updated) {
        db.run(
          `UPDATE roles SET role_code = ?, role_name = ?, description = ?, updated_at = ?
           WHERE oid = ?`,
          [
            role.aid || role.oid,
            role.name,
            role.description || null,
            now,
            role.oid
          ]
        );
        results.updated.push(role);
      }
    }

    if (deleted && deleted.length > 0) {
      for (const item of deleted) {
        const oid = typeof item === 'string' ? item : (item as Record<string, unknown>).oid as string;
        if (!oid) continue;
        db.run('DELETE FROM roles WHERE oid = ?', [oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存角色失败:', error);
    res.status(500).json({ error: '保存角色失败' });
  }
});


// ============================================
// 认证管理
// ============================================

/**
 * 用户登录验证
 * POST /api/authority/auth/login
 * Body: { username: string, password: string }
 */
router.post('/auth/login', async (req, res) => {
  const db = getDatabase();
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  try {
    // 查找用户（支持用户名或真实姓名）
    const stmt = db.prepare(
      'SELECT oid, username, password_hash, real_name, org_oid, org_name, ' +
      'department_oid, department_name, position, email, phone, status ' +
      'FROM users WHERE username = ? OR real_name = ?'
    );
    stmt.bind([username, username]);

    let user: Record<string, unknown> | null = null;
    if (stmt.step()) {
      user = stmt.getAsObject();
    }
    stmt.free();

    if (!user) {
      res.status(401).json({ error: '用户不存在' });
      return;
    }

    // 检查用户状态
    if ((user.status as string) !== 'active') {
      res.status(401).json({ error: '用户已被禁用' });
      return;
    }

    // 验证密码
    const passwordHash = user.password_hash as string;
    if (!passwordHash) {
      console.error('用户密码哈希为空:', user.oid);
      res.status(500).json({ error: '密码验证失败，请联系管理员' });
      return;
    }

    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      res.status(401).json({ error: '密码错误' });
      return;
    }

    // 获取用户角色
    const roleStmt = db.prepare('SELECT role_oid FROM user_roles WHERE user_oid = ?');
    roleStmt.bind([user.oid as string]);
    const roles: string[] = [];
    while (roleStmt.step()) {
      const row = roleStmt.getAsObject() as { role_oid: string };
      roles.push(row.role_oid);
    }
    roleStmt.free();

    // 生成 JWT token
    const token = generateToken({
      userId: user.oid as string,
      aid: user.username as string,
      name: (user.real_name || user.username) as string,
    });

    // 返回用户信息（不包含密码）
    const { password_hash, ...userWithoutPassword } = user;
    res.json({
      success: true,
      token,
      user: userWithoutPassword,
      roles
    });
  } catch (error) {
    console.error('登录验证失败:', error);
    res.status(500).json({ error: '登录验证失败' });
  }
});

// ============================================
// 用户管理
// ============================================

/**
 * 获取用户列表
 */
router.get('/users', (req, res) => {
  const db = getDatabase();
  const { orgOid, status } = req.query;

  let sql = 'SELECT * FROM users WHERE 1=1';
  const bindings: string[] = [];

  if (orgOid) {
    sql += ' AND org_oid = ?';
    bindings.push(orgOid as string);
  }

  if (status) {
    sql += ' AND status = ?';
    bindings.push(status as string);
  }

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      const user = stmt.getAsObject();
      // 去除密码哈希
      delete (user as Record<string, unknown>).password_hash;
      // 字段映射：数据库字段 -> 前端期望字段
      // 数据库: username -> 前端: aid
      // 数据库: real_name -> 前端: name
      (user as Record<string, unknown>).aid = user.username;
      (user as Record<string, unknown>).name = user.real_name;
      results.push(user);
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

/**
 * 保存用户 - 需要认证
 */
router.post('/users', authenticate, (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    if (inserted && inserted.length > 0) {
      for (const user of inserted) {
        const oid = user.oid || `USER_${Date.now()}`;
        const id = `USER_ID_${Date.now()}`;
        const username = user.username || user.aid || '';
        const realName = user.real_name || user.realName || user.name || '';
        const orgOid = user.org_oid || user.orgOid || null;
        const passwordHash = user.passwordHash || user.password_hash || null;

        // 双向同步：根据组织自动填充部门OID
        let departmentOid = user.department_oid || user.departmentOid || null;
        if (!departmentOid && orgOid) {
          const orgStmt = db.prepare('SELECT department_id FROM organizations WHERE oid = ? AND status = ?');
          orgStmt.bind([orgOid, 'active']);
          if (orgStmt.step()) {
            const orgRow = orgStmt.getAsObject();
            departmentOid = (orgRow.department_id as string) || null;
          }
          orgStmt.free();
        }

        db.run(
          `INSERT INTO users (id, oid, username, real_name, password_hash, org_oid, department_oid, email, phone, avatar, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            oid,
            username,
            realName,
            passwordHash,
            orgOid,
            departmentOid,
            user.email || null,
            user.phone || null,
            user.avatar || null,
            user.status || 'active',
            now,
            now
          ]
        );
        results.inserted.push({ oid, ...user });
      }
    }

    if (updated && updated.length > 0) {
      for (const user of updated) {
        const updates: string[] = [];
        const bindings: (string | number | null)[] = [];

        const newOrgOid = user.org_oid || user.orgOid || null;
        if (newOrgOid) {
          updates.push('org_oid = ?');
          bindings.push(newOrgOid);

          // 双向同步：根据组织自动填充部门OID
          if (!user.department_oid && !user.departmentOid) {
            const orgStmt = db.prepare('SELECT department_id FROM organizations WHERE oid = ? AND status = ?');
            orgStmt.bind([newOrgOid, 'active']);
            if (orgStmt.step()) {
              const orgRow = orgStmt.getAsObject();
              const deptId = (orgRow.department_id as string) || null;
              if (deptId) {
                updates.push('department_oid = ?');
                bindings.push(deptId);
              }
            }
            orgStmt.free();
          }
        }
        if (user.department_oid || user.departmentOid) { updates.push('department_oid = ?'); bindings.push(user.department_oid || user.departmentOid); }
        if (user.username || user.aid) { updates.push('username = ?'); bindings.push(user.username || user.aid); }
        if (user.real_name || user.realName || user.name) { updates.push('real_name = ?'); bindings.push(user.real_name || user.realName || user.name); }
        if (user.passwordHash || user.password_hash) { updates.push('password_hash = ?'); bindings.push(user.passwordHash || user.password_hash); }
        if (user.email !== undefined) { updates.push('email = ?'); bindings.push(user.email); }
        if (user.phone !== undefined) { updates.push('phone = ?'); bindings.push(user.phone); }
        if (user.status) { updates.push('status = ?'); bindings.push(user.status); }

        updates.push('updated_at = ?');
        bindings.push(now);
        bindings.push(user.oid);

        db.run(`UPDATE users SET ${updates.join(', ')} WHERE oid = ?`, bindings);
        results.updated.push(user);
      }
    }

    if (deleted && deleted.length > 0) {
      for (const item of deleted) {
        const oid = typeof item === 'string' ? item : (item as Record<string, unknown>).oid as string;
        if (!oid) continue;
        db.run('DELETE FROM users WHERE oid = ?', [oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存用户失败:', error);
    res.status(500).json({ error: '保存用户失败' });
  }
});

/**
 * 保存用户角色关联 - 需要认证
 */
router.post('/users/:userOid/roles', authenticate, (req, res) => {
  const db = getDatabase();
  const { userOid } = req.params;
  const { roleOids } = req.body;

  try {
    // 先删除现有关联
    db.run('DELETE FROM user_roles WHERE user_oid = ?', [userOid]);

    // 插入新关联
    for (const roleOid of roleOids) {
      db.run(
        'INSERT INTO user_roles (user_oid, role_oid, created_at) VALUES (?, ?, ?)',
        [userOid, roleOid, new Date().toISOString()]
      );
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('保存用户角色关联失败:', error);
    res.status(500).json({ error: '保存用户角色关联失败' });
  }
});

/**
 * 获取用户角色
 */
router.get('/users/:userOid/roles', (req, res) => {
  const db = getDatabase();
  const { userOid } = req.params;

  try {
    const stmt = db.prepare('SELECT role_oid FROM user_roles WHERE user_oid = ?');
    stmt.bind([userOid]);
    const roles: string[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as { role_oid: string };
      roles.push(row.role_oid);
    }
    stmt.free();
    res.json(roles);
  } catch (error) {
    console.error('获取用户角色失败:', error);
    res.status(500).json({ error: '获取用户角色失败' });
  }
});

// ============================================
// 工序管理
// ============================================

/**
 * 获取工序树
 */
router.get('/processes', (req, res) => {
  const db = getDatabase();
  const { rows = -1, id, appType, sort = 'sort_order', order = 'asc' } = req.query;

  let sql = 'SELECT * FROM processes WHERE status = ?';
  const bindings: (string | number)[] = ['active'];

  if (appType !== undefined) {
    sql += ' AND app_type = ?';
    bindings.push(Number(appType));
  }

  if (!id) {
    sql += ' AND parent_oid IS NULL';
  } else {
    sql += ' AND parent_oid = ?';
    bindings.push(id as string);
  }

  // ORDER BY 白名单验证，防止 SQL 注入
  const allowedSorts = ['sort_order', 'name', 'oid', 'created_at', 'status', 'app_type'];
  const allowedOrders = ['asc', 'desc'];
  const safeSort = allowedSorts.includes(sort as string) ? sort : 'sort_order';
  const safeOrder = allowedOrders.includes((order as string).toLowerCase()) ? (order as string).toLowerCase() : 'asc';
  sql += ` ORDER BY ${safeSort} ${safeOrder}`;

  if (Number(rows) > 0) {
    sql += ' LIMIT ?';
    bindings.push(Number(rows));
  }

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    // 递归加载子节点
    const loadChildren = (nodes: Record<string, unknown>[]): Record<string, unknown>[] => {
      return nodes.map(node => {
        const childrenSql = 'SELECT * FROM processes WHERE status = ? AND parent_oid = ?';
        const childStmt = db.prepare(childrenSql);
        childStmt.bind(['active', node.oid as string]);
        const children: Record<string, unknown>[] = [];
        while (childStmt.step()) {
          children.push(childStmt.getAsObject());
        }
        childStmt.free();
        if (children.length > 0) {
          (node as Record<string, unknown>).children = loadChildren(children);
        }
        return node;
      });
    };

    res.json(loadChildren(results));
  } catch (error) {
    console.error('获取工序树失败:', error);
    res.status(500).json({ error: '获取工序树失败' });
  }
});

/**
 * 保存工序 - 需要认证
 */
router.post('/processes', authenticate, (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    if (inserted && inserted.length > 0) {
      for (const proc of inserted) {
        const oid = proc.oid || `PROC_${Date.now()}`;
        db.run(
          `INSERT INTO processes (oid, parent_oid, process_code, process_name, route, icon,
            app_type, is_hidden, description, sort_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            oid,
            proc.oidParent || proc.parent_oid || null,
            proc.aid || proc.process_code || oid,
            proc.name || proc.process_name,
            proc.route || proc.execName || null,
            proc.icon || null,
            proc.appType || proc.app_type || 0,
            proc.hidden || proc.is_hidden ? 1 : 0,
            proc.description || null,
            proc.sortNumber || proc.sort_order || 0,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ OID: oid, ...proc });
      }
    }

    if (updated && updated.length > 0) {
      for (const proc of updated) {
        db.run(
          `UPDATE processes SET parent_oid = ?, process_code = ?, process_name = ?,
            route = ?, icon = ?, app_type = ?, is_hidden = ?, description = ?,
            sort_order = ?, updated_at = ?
           WHERE oid = ?`,
          [
            proc.oidParent || proc.parent_oid || null,
            proc.aid || proc.process_code,
            proc.name || proc.process_name,
            proc.route || proc.execName || null,
            proc.icon || null,
            proc.appType || proc.app_type || 0,
            proc.hidden || proc.is_hidden ? 1 : 0,
            proc.description || null,
            proc.sortNumber || proc.sort_order || 0,
            now,
            proc.oid
          ]
        );
        results.updated.push(proc);
      }
    }

    if (deleted && deleted.length > 0) {
      for (const item of deleted) {
        const oid = typeof item === 'string' ? item : (item as Record<string, unknown>).oid as string;
        if (!oid) continue;
        db.run('DELETE FROM processes WHERE oid = ?', [oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存工序失败:', error);
    res.status(500).json({ error: '保存工序失败' });
  }
});

// ============================================
// 动作管理
// ============================================

/**
 * 获取动作列表
 */
router.get('/actions', (req, res) => {
  const db = getDatabase();
  const { appType, category } = req.query;

  let sql = 'SELECT * FROM actions WHERE status = ?';
  const bindings: (string | number)[] = ['active'];

  if (appType !== undefined) {
    sql += ' AND app_type = ?';
    bindings.push(Number(appType));
  }

  if (category) {
    sql += ' AND category = ?';
    bindings.push(category as string);
  }

  sql += ' ORDER BY sort_order ASC';

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取动作列表失败:', error);
    res.status(500).json({ error: '获取动作列表失败' });
  }
});

// ============================================
// 角色权限管理
// ============================================

/**
 * 获取角色权限
 */
router.get('/roles/:roleOid/authority', (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;
  const { appType = 0 } = req.query;

  try {
    const stmt = db.prepare(`
      SELECT ra.role_oid as roleOid, ra.process_oid as processOid,
             ra.action_oid as actionOid, ra.value
      FROM roles_authority ra
      JOIN processes p ON ra.process_oid = p.oid
      WHERE ra.role_oid = ? AND p.app_type = ?
    `);
    stmt.bind([roleOid, Number(appType)]);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取角色权限失败:', error);
    res.status(500).json({ error: '获取角色权限失败' });
  }
});

/**
 * 保存角色权限 - 需要认证
 */
router.post('/roles/:roleOid/authority', authenticate, (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;
  const { authorities } = req.body;

  try {
    const now = new Date().toISOString();

    for (const auth of authorities) {
      if (auth.value === -1) {
        // -1 表示删除权限记录
        db.run(
          'DELETE FROM roles_authority WHERE role_oid = ? AND process_oid = ? AND action_oid = ?',
          [roleOid, auth.processOid, auth.actionOid]
        );
      } else {
        // upsert
        const existing = db.prepare(
          'SELECT id FROM roles_authority WHERE role_oid = ? AND process_oid = ? AND action_oid = ?'
        );
        existing.bind([roleOid, auth.processOid, auth.actionOid]);
        const exists = existing.step();
        existing.free();

        if (exists) {
          db.run(
            'UPDATE roles_authority SET value = ?, updated_at = ? WHERE role_oid = ? AND process_oid = ? AND action_oid = ?',
            [auth.value, now, roleOid, auth.processOid, auth.actionOid]
          );
        } else {
          db.run(
            'INSERT INTO roles_authority (role_oid, process_oid, action_oid, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [roleOid, auth.processOid, auth.actionOid, auth.value, now, now]
          );
        }
      }
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('保存角色权限失败:', error);
    res.status(500).json({ error: '保存角色权限失败' });
  }
});

// ============================================
// 数据权限管理
// ============================================

/**
 * 获取角色数据权限
 */
router.get('/roles/:roleOid/data-authority', (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT role_oid as roleOid, org_oid as orgOid
      FROM roles_data_authority
      WHERE role_oid = ?
    `);
    stmt.bind([roleOid]);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取角色数据权限失败:', error);
    res.status(500).json({ error: '获取角色数据权限失败' });
  }
});

/**
 * 保存角色数据权限 - 需要认证
 */
router.post('/roles/:roleOid/data-authority', authenticate, (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;
  const { orgOids, isAuthorize } = req.body;

  try {
    const now = new Date().toISOString();

    if (isAuthorize) {
      for (const orgOid of orgOids) {
        const existing = db.prepare(
          'SELECT id FROM roles_data_authority WHERE role_oid = ? AND org_oid = ?'
        );
        existing.bind([roleOid, orgOid]);
        const exists = existing.step();
        existing.free();

        if (!exists) {
          db.run(
            'INSERT INTO roles_data_authority (role_oid, org_oid, created_at) VALUES (?, ?, ?)',
            [roleOid, orgOid, now]
          );
        }
      }
    } else {
      for (const orgOid of orgOids) {
        db.run('DELETE FROM roles_data_authority WHERE role_oid = ? AND org_oid = ?', [roleOid, orgOid]);
      }
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('保存角色数据权限失败:', error);
    res.status(500).json({ error: '保存角色数据权限失败' });
  }
});

// ============================================
// 角色权限快捷操作
// ============================================

/**
 * 授予角色全部工序+动作权限
 * POST /api/authority/roles/:roleOid/authority/all
 */
router.post('/roles/:roleOid/authority/all', authenticate, (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;
  const { appType = 0 } = req.body;

  try {
    const now = new Date().toISOString();
    // 获取所有工序和动作
    const processes = db.prepare('SELECT oid FROM processes WHERE status = ? AND app_type = ?');
    processes.bind(['active', Number(appType)]);
    const processOids: string[] = [];
    while (processes.step()) {
      processOids.push((processes.getAsObject() as { oid: string }).oid);
    }
    processes.free();

    const actions = db.prepare('SELECT oid FROM actions WHERE status = ?');
    actions.bind(['active']);
    const actionOids: string[] = [];
    while (actions.step()) {
      actionOids.push((actions.getAsObject() as { oid: string }).oid);
    }
    actions.free();

    // 批量插入权限（忽略冲突）
    for (const processOid of processOids) {
      for (const actionOid of actionOids) {
        try {
          db.run(
            'INSERT OR IGNORE INTO roles_authority (role_oid, process_oid, action_oid, value, created_at) VALUES (?, ?, ?, 1, ?)',
            [roleOid, processOid, actionOid, now]
          );
        } catch { /* 忽略冲突 */ }
      }
    }

    saveDatabase();
    res.json({ success: true, message: `已授予 ${processOids.length} 个工序 × ${actionOids.length} 个动作的全部权限` });
  } catch (error) {
    console.error('全部授权失败:', error);
    res.status(500).json({ error: '全部授权失败' });
  }
});

/**
 * 工序级授权：授予/取消角色对某个工序的全部动作权限
 * POST /api/authority/roles/:roleOid/authority/process
 * Body: { processOid, value: 1(授权) | 0(取消) }
 */
router.post('/roles/:roleOid/authority/process', authenticate, (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;
  const { processOid, value } = req.body;

  try {
    const now = new Date().toISOString();
    const actions = db.prepare('SELECT oid FROM actions WHERE status = ?');
    actions.bind(['active']);
    const actionOids: string[] = [];
    while (actions.step()) {
      actionOids.push((actions.getAsObject() as { oid: string }).oid);
    }
    actions.free();

    if (value === 0) {
      // 取消权限：删除该工序下所有动作
      for (const actionOid of actionOids) {
        db.run('DELETE FROM roles_authority WHERE role_oid = ? AND process_oid = ? AND action_oid = ?',
          [roleOid, processOid, actionOid]);
      }
    } else {
      // 授予权限
      for (const actionOid of actionOids) {
        try {
          db.run(
            'INSERT OR IGNORE INTO roles_authority (role_oid, process_oid, action_oid, value, created_at) VALUES (?, ?, ?, 1, ?)',
            [roleOid, processOid, actionOid, now]
          );
        } catch { /* 忽略冲突 */ }
      }
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('工序级授权失败:', error);
    res.status(500).json({ error: '工序级授权失败' });
  }
});

/**
 * 授予角色全部组织数据权限
 * POST /api/authority/roles/:roleOid/data-authority/all
 */
router.post('/roles/:roleOid/data-authority/all', authenticate, (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;

  try {
    const now = new Date().toISOString();
    const orgs = db.prepare('SELECT oid FROM organizations WHERE status = ?');
    orgs.bind(['active']);
    const orgOids: string[] = [];
    while (orgs.step()) {
      orgOids.push((orgs.getAsObject() as { oid: string }).oid);
    }
    orgs.free();

    for (const orgOid of orgOids) {
      try {
        db.run(
          'INSERT OR IGNORE INTO roles_data_authority (role_oid, org_oid, created_at) VALUES (?, ?, ?)',
          [roleOid, orgOid, now]
        );
      } catch { /* 忽略冲突 */ }
    }

    saveDatabase();
    res.json({ success: true, message: `已授予 ${orgOids.length} 个组织的数据权限` });
  } catch (error) {
    console.error('数据权限全部授权失败:', error);
    res.status(500).json({ error: '数据权限全部授权失败' });
  }
});

// ============================================
// 用户特殊权限管理
// ============================================

/**
 * 获取用户特殊权限覆盖
 * GET /api/authority/users/:userOid/authority
 */
router.get('/users/:userOid/authority', (req, res) => {
  const db = getDatabase();
  const { userOid } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT user_oid as userOid, process_oid as processOid,
             action_oid as actionOid, value
      FROM users_authority
      WHERE user_oid = ?
    `);
    stmt.bind([userOid]);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取用户特殊权限失败:', error);
    res.status(500).json({ error: '获取用户特殊权限失败' });
  }
});

/**
 * 保存用户特殊权限覆盖
 * POST /api/authority/users/:userOid/authority
 * Body: { authorities: [{ processOid, actionOid, value }] }
 */
router.post('/users/:userOid/authority', authenticate, (req, res) => {
  const db = getDatabase();
  const { userOid } = req.params;
  const { authorities } = req.body;

  try {
    const now = new Date().toISOString();

    for (const auth of authorities) {
      if (auth.value === -1) {
        db.run(
          'DELETE FROM users_authority WHERE user_oid = ? AND process_oid = ? AND action_oid = ?',
          [userOid, auth.processOid, auth.actionOid]
        );
      } else {
        const existing = db.prepare(
          'SELECT id FROM users_authority WHERE user_oid = ? AND process_oid = ? AND action_oid = ?'
        );
        existing.bind([userOid, auth.processOid, auth.actionOid]);
        const exists = existing.step();
        existing.free();

        if (exists) {
          db.run(
            'UPDATE users_authority SET value = ?, updated_at = ? WHERE user_oid = ? AND process_oid = ? AND action_oid = ?',
            [auth.value, now, userOid, auth.processOid, auth.actionOid]
          );
        } else {
          db.run(
            'INSERT INTO users_authority (user_oid, process_oid, action_oid, value, created_at) VALUES (?, ?, ?, ?, ?)',
            [userOid, auth.processOid, auth.actionOid, auth.value, now]
          );
        }
      }
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('保存用户特殊权限失败:', error);
    res.status(500).json({ error: '保存用户特殊权限失败' });
  }
});

// ============================================
// 用户账号管理
// ============================================

/**
 * 修改用户密码
 * PUT /api/authority/users/:oid/password
 * Body: { oldPassword?, newPassword }
 * 管理员不需要旧密码，普通用户修改自己密码需要验证旧密码
 */
router.put('/users/:oid/password', authenticate, async (req, res) => {
  const db = getDatabase();
  const { oid } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (!newPassword) {
    res.status(400).json({ error: '新密码不能为空' });
    return;
  }

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE oid = ?');
    stmt.bind([oid]);
    if (!stmt.step()) {
      stmt.free();
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    const user = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();

    // 非管理员需要验证旧密码
    if (oldPassword) {
      const isValid = await bcrypt.compare(oldPassword, user.password_hash as string);
      if (!isValid) {
        res.status(401).json({ error: '旧密码错误' });
        return;
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE oid = ?',
      [newHash, new Date().toISOString(), oid]);

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

/**
 * 启停用户
 * PUT /api/authority/users/:oid/status
 * Body: { status: 'active' | 'inactive' }
 */
router.put('/users/:oid/status', authenticate, (req, res) => {
  const db = getDatabase();
  const { oid } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    res.status(400).json({ error: '状态值无效' });
    return;
  }

  try {
    db.run('UPDATE users SET status = ?, updated_at = ? WHERE oid = ?',
      [status, new Date().toISOString(), oid]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('启停用户失败:', error);
    res.status(500).json({ error: '启停用户失败' });
  }
});

// ============================================
// 权限验证接口
// ============================================

/**
 * 获取当前登录用户的完整权限摘要
 * GET /api/authority/my-permissions
 */
router.get('/my-permissions', authenticate, (req, res) => {
  const db = getDatabase();
  const userOid = req.user?.userId;

  if (!userOid) {
    res.status(401).json({ error: '未认证' });
    return;
  }

  try {
    // 获取用户信息
    const userStmt = db.prepare('SELECT * FROM users WHERE oid = ?');
    userStmt.bind([userOid]);
    if (!userStmt.step()) {
      userStmt.free();
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    const user = userStmt.getAsObject() as Record<string, unknown>;
    userStmt.free();

    // 获取用户角色
    const roleStmt = db.prepare(`
      SELECT r.* FROM roles r
      JOIN user_roles ur ON r.oid = ur.role_oid
      WHERE ur.user_oid = ? AND r.status = 'active'
    `);
    roleStmt.bind([userOid]);
    const roles: Record<string, unknown>[] = [];
    while (roleStmt.step()) {
      roles.push(roleStmt.getAsObject());
    }
    roleStmt.free();

    // 判断是否 Admin（用户名admin、角色code为admin或administrators）
    const isAdmin = user.username === 'admin' ||
      roles.some(r => {
        const code = (r.role_code as string)?.toLowerCase();
        return code === 'admin' || code === 'administrators';
      });

    // 获取角色权限汇总（工序-动作）
    const roleOids = roles.map(r => r.oid as string);
    let allAuthorities: Record<string, unknown>[] = [];

    if (roleOids.length > 0) {
      const placeholders = roleOids.map(() => '?').join(',');
      const authStmt = db.prepare(`
        SELECT DISTINCT ra.process_oid as processOid, ra.action_oid as actionOid, ra.value
        FROM roles_authority ra
        WHERE ra.role_oid IN (${placeholders})
      `);
      authStmt.bind(roleOids);
      while (authStmt.step()) {
        allAuthorities.push(authStmt.getAsObject());
      }
      authStmt.free();
    }

    // 获取用户特殊权限覆盖
    const userAuthStmt = db.prepare(`
      SELECT process_oid as processOid, action_oid as actionOid, value
      FROM users_authority
      WHERE user_oid = ?
    `);
    userAuthStmt.bind([userOid]);
    const userAuthorities: Record<string, unknown>[] = [];
    while (userAuthStmt.step()) {
      userAuthorities.push(userAuthStmt.getAsObject());
    }
    userAuthStmt.free();

    // 获取数据权限范围（组织 OID 列表）
    let dataOrgOids: string[] = [];
    if (roleOids.length > 0) {
      const dataPlaceholders = roleOids.map(() => '?').join(',');
      const dataStmt = db.prepare(`
        SELECT DISTINCT org_oid FROM roles_data_authority
        WHERE role_oid IN (${dataPlaceholders})
      `);
      dataStmt.bind(roleOids);
      while (dataStmt.step()) {
        dataOrgOids.push((dataStmt.getAsObject() as { org_oid: string }).org_oid);
      }
      dataStmt.free();
    }

    res.json({
      success: true,
      data: {
        user: { oid: user.oid, username: user.username, realName: user.real_name, orgOid: user.org_oid },
        roles: roles.map(r => ({ oid: r.oid, code: r.role_code, name: r.role_name, isSystem: r.is_system })),
        isAdmin,
        authorities: allAuthorities,
        userAuthorities,
        dataOrgOids
      }
    });
  } catch (error) {
    console.error('获取权限摘要失败:', error);
    res.status(500).json({ error: '获取权限摘要失败' });
  }
});

/**
 * 检查用户是否有特定权限
 * GET /api/authority/check-authority?processRoute=xxx&actionCode=xxx
 */
router.get('/check-authority', authenticate, (req, res) => {
  const db = getDatabase();
  const userOid = req.user?.userId;
  const { processRoute, actionCode } = req.query;

  if (!userOid) {
    res.status(401).json({ error: '未认证' });
    return;
  }

  if (!processRoute || !actionCode) {
    res.status(400).json({ error: '请提供 processRoute 和 actionCode 参数' });
    return;
  }

  try {
    // 检查是否为 admin（通过角色判断）
    const userRoleStmt = db.prepare(`
      SELECT r.role_code FROM user_roles ur
      JOIN roles r ON r.oid = ur.role_oid
      WHERE ur.user_oid = ?
    `);
    userRoleStmt.bind([userOid]);
    const roleCodes: string[] = [];
    while (userRoleStmt.step()) {
      roleCodes.push((userRoleStmt.getAsObject() as { role_code: string }).role_code);
    }
    userRoleStmt.free();

    const isAdmin = roleCodes.some(c => c.toLowerCase() === 'admin' || c.toLowerCase() === 'administrators');
    if (isAdmin) {
      res.json({ success: true, data: { authorized: true, isAdmin: true } });
      return;
    }

    // 查找工序和动作
    const procStmt = db.prepare('SELECT oid FROM processes WHERE route = ? AND status = ?');
    procStmt.bind([processRoute as string, 'active']);
    const processOid = procStmt.step() ? (procStmt.getAsObject() as { oid: string }).oid : null;
    procStmt.free();

    const actionStmt = db.prepare('SELECT oid FROM actions WHERE action_code = ? AND status = ?');
    actionStmt.bind([actionCode as string, 'active']);
    const actionOid = actionStmt.step() ? (actionStmt.getAsObject() as { oid: string }).oid : null;
    actionStmt.free();

    if (!processOid || !actionOid) {
      res.json({ success: true, data: { authorized: false, reason: '工序或动作不存在' } });
      return;
    }

    // 检查用户特殊权限（最高优先级）
    const userAuthStmt = db.prepare(
      'SELECT value FROM users_authority WHERE user_oid = ? AND process_oid = ? AND action_oid = ?'
    );
    userAuthStmt.bind([userOid, processOid, actionOid]);
    if (userAuthStmt.step()) {
      const userAuth = userAuthStmt.getAsObject() as { value: number };
      userAuthStmt.free();
      res.json({ success: true, data: { authorized: userAuth.value === 1, source: 'user_override' } });
      return;
    }
    userAuthStmt.free();

    // 检查角色权限
    const roleAuthStmt = db.prepare(`
      SELECT MAX(ra.value) as maxValue
      FROM roles_authority ra
      JOIN user_roles ur ON ra.role_oid = ur.role_oid
      JOIN roles r ON ur.role_oid = r.oid AND r.status = 'active'
      WHERE ur.user_oid = ? AND ra.process_oid = ? AND ra.action_oid = ?
    `);
    roleAuthStmt.bind([userOid, processOid, actionOid]);
    const authorized = roleAuthStmt.step() &&
      ((roleAuthStmt.getAsObject() as { maxValue: number | null }).maxValue ?? 0) >= 1;
    roleAuthStmt.free();

    res.json({ success: true, data: { authorized, source: authorized ? 'role' : 'none' } });
  } catch (error) {
    console.error('权限检查失败:', error);
    res.status(500).json({ error: '权限检查失败' });
  }
});

export default router;
