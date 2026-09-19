"""
落盘修复验证的测试残留清理脚本（2026-09-19）

背景：
  验证 "写端点漏 saveDatabase()" 修复时，通过 API 建了一条测试岗位
  positions.code = 'ZZTESTPERSIST20260919'。API 的 DELETE 只做软删除
  （status='inactive'），无法彻底移除，于是留在了库里。

本脚本做什么：
  1. 删除 positions 表中所有 code LIKE 'ZZTEST%' 的行（硬删除）
  2. 顺带清理其他表里同前缀的测试行（camera_devices.camera_code 等）
  3. 做完整性校验 + 前后行数对比

注意事项：
  **必须先停后端**。后端持有 sql.js 内存副本，任何写请求触发 saveDatabase()
  都会用内存状态覆盖本脚本的修改。

用法：
  cd server && python scripts/purge_test_records.py          # 预演，不写任何数据
  cd server && python scripts/purge_test_records.py --yes    # 执行
"""

import argparse
import os
import shutil
import sqlite3
import sys
from datetime import datetime

# Windows 控制台默认 GBK，非 ASCII 输出可能触发 UnicodeEncodeError 中断脚本
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'yuanxingtu.db')

# 测试数据前缀 → 对应表与列（只清理这些明确的测试前缀，不做模糊匹配）
TARGETS = [
    ('positions', 'code', 'ZZTEST%'),
    ('camera_devices', 'camera_code', 'ZZTEST%'),
    # 落盘/审计验证时建过一条 2026-12-31 的测试排班，触发了可用性刷新而在
    # team_daily_availability 留下 T001/T002 两行（各字段均为 0）的残留。
    # 该表只有 upsert 没有删除接口，只能在这里按日期精确清理。
    ('team_daily_availability', 'date', '2026-12-31'),
]

# 明确**不清理**的表：operation_logs（审计日志）
#   理由：判断"哪条审计记录是测试产生的"只能靠描述文本模糊匹配，而
#   description LIKE 'POST /api/cameras' 同样会命中操作员真实的建摄像头操作 ——
#   用这种模式批量删审计记录会误伤真实审计数据。审计行的去留应由用户显式指定。
AUDIT_TABLE_EXCLUDED = 'operation_logs'


def main() -> int:
    parser = argparse.ArgumentParser(description='清理测试残留记录')
    parser.add_argument('--yes', action='store_true', help='确认执行（不加则只预演）')
    parser.add_argument('--no-backup', action='store_true', help='跳过自动备份（不推荐）')
    args = parser.parse_args()

    # 结构性保护：本脚本不允许碰审计日志表（判断"哪条审计是测试产生的"只能靠
    # 描述文本模糊匹配，必然误伤真实操作记录）。有人往 TARGETS 里加了就直接拒绝运行，
    # 而不是靠注释提醒。
    if any(t[0] == AUDIT_TABLE_EXCLUDED for t in TARGETS):
        print(f'[FAIL] 拒绝执行：TARGETS 里包含审计表 {AUDIT_TABLE_EXCLUDED}')
        print('       审计记录只能由用户显式指定 ID 删除，不走本脚本。')
        return 1

    db_path = os.path.abspath(DB_PATH)
    if not os.path.exists(db_path):
        print(f'[FAIL] 找不到数据库：{db_path}')
        return 1

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # ---- 采集现状 ----
    found = []
    for table, column, pattern in TARGETS:
        cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} LIKE ?", (pattern,))
        cnt = cur.fetchone()[0]
        if cnt:
            cur.execute(f"SELECT {column} FROM {table} WHERE {column} LIKE ?", (pattern,))
            names = [r[0] for r in cur.fetchall()]
            found.append((table, column, pattern, cnt, names))

    if not found:
        print('[OK] 没有匹配的测试残留记录，无需清理')
        conn.close()
        return 0

    print('=' * 60)
    print('待删除记录：')
    for table, column, pattern, cnt, names in found:
        print(f'  {table}.{column} LIKE {pattern}  ->  {cnt} 行: {names}')

    if not args.yes:
        print()
        print('[DRY-RUN] 预演模式，未做任何修改。确认后加 --yes 执行。')
        conn.close()
        return 0

    # ---- 自动备份 ----
    if not args.no_backup:
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f'{db_path}.bak_purgetest_{stamp}'
        shutil.copy2(db_path, backup_path)
        print(f'\n[BACKUP] 已备份到：{backup_path}')

    # ---- 执行删除 ----
    before_integrity = cur.execute('PRAGMA integrity_check').fetchone()[0]

    deleted_total = 0
    try:
        cur.execute('BEGIN')
        for table, column, pattern, cnt, names in found:
            cur.execute(f"DELETE FROM {table} WHERE {column} LIKE ?", (pattern,))
            deleted_total += cur.rowcount
        cur.execute('COMMIT')
    except Exception as e:
        cur.execute('ROLLBACK')
        print(f'[FAIL] 删除失败已回滚：{e}')
        conn.close()
        return 1

    # ---- 校验 ----
    remaining = 0
    for table, column, pattern in TARGETS:
        cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} LIKE ?", (pattern,))
        remaining += cur.fetchone()[0]

    after_integrity = cur.execute('PRAGMA integrity_check').fetchone()[0]
    fk_violations = len(cur.execute('PRAGMA foreign_key_check').fetchall())

    print(f'\n[RESULT] 删除 {deleted_total} 行，剩余匹配 {remaining} 行')
    print(f'[CHECK] integrity_check: {before_integrity} -> {after_integrity}')
    print(f'[CHECK] foreign_key_check 违规数: {fk_violations}')

    conn.commit()
    conn.close()

    if remaining != 0 or after_integrity != 'ok' or fk_violations != 0:
        print('[FAIL] 校验未通过，请从备份恢复')
        return 1

    print('[OK] 清理完成且校验通过')
    return 0


if __name__ == '__main__':
    sys.exit(main())
