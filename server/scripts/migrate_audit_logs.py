"""
把 audit_logs 的历史记录迁移进 operation_logs（2026-09-19）

背景：
  audit_logs 是一张只写不读的表 —— 全站没有任何查询/接口/页面读它。
  119 条种源/育苗/种植/库存的操作记录（2026-06-30 ~ 2026-08-21）写进去之后
  在操作日志页（/settings/audit-log）完全看不到。
  08-21 之后这些写入点改走 operation_logs，但历史数据还留在旧表。

本脚本做什么：
  1. 把 audit_logs 的行按映射搬到 operation_logs
  2. ID 用 `mig_<原ID>`，配合 INSERT OR IGNORE —— 重复执行不会产生重复行
  3. **不删除 audit_logs 原表数据**（保留原始记录，随时可回溯）
  4. 做完整性校验 + 迁移前后行数对比

注意事项：
  **必须先停后端**。后端持有 sql.js 内存副本，任何写请求触发 saveDatabase()
  都会用内存状态覆盖本脚本的修改。

用法：
  cd server && python scripts/migrate_audit_logs.py          # 预演
  cd server && python scripts/migrate_audit_logs.py --yes    # 执行
"""

import argparse
import os
import shutil
import sqlite3
import sys
from datetime import datetime

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'yuanxingtu.db')

# business_type 前缀 → operation_logs.module（与 services/auditLog.service.ts 保持一致）
MODULE_BY_BUSINESS_TYPE = {
    'inventory_stock': '物资管理',
    'inventory': '物资管理',
    'planting': '作物管理',
    'seedling': '作物管理',
    'seed_source': '作物管理',
    'crop': '作物管理',
}
DEFAULT_MODULE = '其他'


def resolve_module(business_type: str) -> str:
    head = (business_type or '').split('.')[0]
    return MODULE_BY_BUSINESS_TYPE.get(head, DEFAULT_MODULE)


def main() -> int:
    parser = argparse.ArgumentParser(description='迁移 audit_logs → operation_logs')
    parser.add_argument('--yes', action='store_true', help='确认执行（不加则只预演）')
    parser.add_argument('--no-backup', action='store_true', help='跳过自动备份（不推荐）')
    args = parser.parse_args()

    db_path = os.path.abspath(DB_PATH)
    if not os.path.exists(db_path):
        print(f'[FAIL] 找不到数据库：{db_path}')
        return 1

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute('SELECT COUNT(*) FROM audit_logs')
    total = cur.fetchone()[0]

    cur.execute(
        "SELECT COUNT(*) FROM operation_logs WHERE id LIKE 'mig_%'"
    )
    already = cur.fetchone()[0]

    print('=' * 62)
    print(f'audit_logs 待迁移行数      : {total}')
    print(f'operation_logs 已迁移行数  : {already}')

    if total == 0:
        print('[OK] audit_logs 没有数据，无需迁移')
        conn.close()
        return 0

    # 预演：打印模块归属分布
    cur.execute('SELECT business_type FROM audit_logs')
    dist = {}
    for (bt,) in cur.fetchall():
        m = resolve_module(bt)
        dist[m] = dist.get(m, 0) + 1
    print('迁移后模块分布            : ' + ', '.join(f'{k}={v}' for k, v in sorted(dist.items())))

    if not args.yes:
        print()
        print('[DRY-RUN] 预演模式，未做任何修改。确认后加 --yes 执行。')
        conn.close()
        return 0

    if not args.no_backup:
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f'{db_path}.bak_migrateaudit_{stamp}'
        shutil.copy2(db_path, backup_path)
        print(f'\n[BACKUP] 已备份到：{backup_path}')

    cur.execute('SELECT COUNT(*) FROM operation_logs')
    op_before = cur.fetchone()[0]
    integrity_before = cur.execute('PRAGMA integrity_check').fetchone()[0]

    inserted = 0
    try:
        cur.execute('BEGIN')
        cur.execute('SELECT id, business_type, business_id, action, operator_id, '
                    'operator_name, opinion, created_at FROM audit_logs')
        rows = cur.fetchall()
        for (aid, btype, bid, action, opid, opname, opinion, created) in rows:
            cur.execute(
                """INSERT OR IGNORE INTO operation_logs
                   (id, user_id, username, action, module, resource_type, resource_id,
                    description, status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'success', ?)""",
                (f'mig_{aid}', opid or '', opname or '', action or '', resolve_module(btype),
                 btype or '', bid or '', opinion or btype or '', created),
            )
            inserted += cur.rowcount
        cur.execute('COMMIT')
    except Exception as e:
        cur.execute('ROLLBACK')
        print(f'[FAIL] 迁移失败已回滚：{e}')
        conn.close()
        return 1

    cur.execute('SELECT COUNT(*) FROM operation_logs')
    op_after = cur.fetchone()[0]
    integrity_after = cur.execute('PRAGMA integrity_check').fetchone()[0]
    migrated = cur.execute("SELECT COUNT(*) FROM operation_logs WHERE id LIKE 'mig_%'").fetchone()[0]
    src_kept = cur.execute('SELECT COUNT(*) FROM audit_logs').fetchone()[0]

    print(f'\n[RESULT] 新插入 {inserted} 行；operation_logs {op_before} → {op_after}')
    print(f'[CHECK]  已迁移标记行数: {migrated} / 源表 {total}')
    print(f'[CHECK]  audit_logs 原表保留: {src_kept} 行（不删，可回溯）')
    print(f'[CHECK]  integrity_check: {integrity_before} -> {integrity_after}')

    conn.commit()
    conn.close()

    if integrity_after != 'ok' or migrated != total:
        print('[FAIL] 校验未通过')
        return 1

    print('[OK] 迁移完成且校验通过')
    return 0


if __name__ == '__main__':
    sys.exit(main())
