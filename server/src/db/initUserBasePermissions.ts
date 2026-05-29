/**
 * 用户基地权限数据初始化脚本
 * 运行方式: npx tsx src/db/initUserBasePermissions.ts
 *
 * 功能：
 * 1. 创建 user_base_permissions 表（如果不存在）
 * 2. 为现有用户添加默认基地权限
 */

import { getDatabase, saveDatabase } from './index';

async function initUserBasePermissions() {
  const db = getDatabase();
  const now = new Date().toISOString();

  console.log('开始初始化用户基地权限...\n');

  // 1. 创建表（如果不存在）
  console.log('1. 创建 user_base_permissions 表...');
  db.run(`
    CREATE TABLE IF NOT EXISTS user_base_permissions (
      id TEXT PRIMARY KEY,
      user_oid TEXT NOT NULL,
      base_oid TEXT NOT NULL,
      base_name TEXT NOT NULL,
      access_level TEXT DEFAULT 'read' CHECK(access_level IN ('none', 'read', 'write', 'admin')),
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(user_oid, base_oid)
    )
  `);

  // 创建索引
  try {
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_base_permissions_user ON user_base_permissions(user_oid)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_base_permissions_base ON user_base_permissions(base_oid)`);
    console.log('   索引创建完成');
  } catch (e) {
    console.log('   索引已存在，跳过');
  }

  // 2. 获取所有用户
  console.log('\n2. 查询现有用户...');
  const usersStmt = db.prepare('SELECT oid, username, real_name FROM users WHERE status = ?');
  usersStmt.bind(['active']);
  const users: { oid: string; username: string; real_name: string }[] = [];
  while (usersStmt.step()) {
    users.push(usersStmt.getAsObject() as { oid: string; username: string; real_name: string });
  }
  usersStmt.free();
  console.log(`   找到 ${users.length} 个活跃用户`);

  // 3. 获取所有基地
  console.log('\n3. 查询可用基地...');
  const basesStmt = db.prepare(`
    SELECT DISTINCT base_oid as baseOid, base_name as baseName
    FROM greenhouses
    WHERE base_oid IS NOT NULL AND base_oid != '' AND base_name IS NOT NULL AND base_name != ''
    ORDER BY base_name ASC
  `);
  const bases: { baseOid: string; baseName: string }[] = [];
  while (basesStmt.step()) {
    bases.push(basesStmt.getAsObject() as { baseOid: string; baseName: string });
  }
  basesStmt.free();
  console.log(`   找到 ${bases.length} 个基地`);
  bases.forEach(b => console.log(`   - ${b.baseName} (${b.baseOid})`));

  // 4. 为所有用户分配所有基地的读写权限（默认设置）
  console.log('\n4. 分配用户基地权限...');

  let assignedCount = 0;
  for (const user of users) {
    for (const base of bases) {
      // 检查是否已存在权限
      const checkStmt = db.prepare('SELECT id FROM user_base_permissions WHERE user_oid = ? AND base_oid = ?');
      checkStmt.bind([user.oid, base.baseOid]);
      const exists = checkStmt.step();
      checkStmt.free();

      if (!exists) {
        const id = `UBP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        db.run(`
          INSERT INTO user_base_permissions (id, user_oid, base_oid, base_name, access_level, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, user.oid, base.baseOid, base.baseName, 'write', now, now]);
        assignedCount++;
      }
    }
    console.log(`   用户 ${user.real_name || user.username} (${user.oid}): 已分配 ${bases.length} 个基地`);
  }

  console.log(`\n   共新增 ${assignedCount} 条权限记录`);

  // 5. 保存数据库
  console.log('\n5. 保存数据库...');
  saveDatabase();
  console.log('   保存完成');

  // 6. 显示结果
  console.log('\n========== 初始化完成 ==========');
  console.log(`用户数: ${users.length}`);
  console.log(`基地数: ${bases.length}`);
  console.log(`新增权限: ${assignedCount} 条`);

  // 显示每个用户的权限
  console.log('\n用户基地权限汇总:');
  for (const user of users) {
    const permStmt = db.prepare(`
    SELECT ubp.base_name, ubp.access_level
    FROM user_base_permissions ubp
    WHERE ubp.user_oid = ?
  `);
    permStmt.bind([user.oid]);
    const perms: { base_name: string; access_level: string }[] = [];
    while (permStmt.step()) {
      perms.push(permStmt.getAsObject() as { base_name: string; access_level: string });
    }
    permStmt.free();
    console.log(`\n  ${user.real_name || user.username} (${user.oid}):`);
    perms.forEach(p => console.log(`    - ${p.base_name}: ${p.access_level}`));
  }

  db.close();
}

initUserBasePermissions().catch(console.error);
