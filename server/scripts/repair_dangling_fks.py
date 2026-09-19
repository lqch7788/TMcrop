"""
悬空外键修复脚本

背景（2026-09-19 排查）：
  `PRAGMA foreign_key_check` 报出 123 处悬空引用。应用是开着外键强制的
  （server/src/db/index.ts:145 `PRAGMA foreign_keys = ON`），所以这些是真实的完整性债，
  也让 foreign_key_check 失去作为诊断手段的价值（永远有噪音）。

逐案结论（已与用户确认）：
  1. crop_circulation_records.parent_source_id / new_source_id -> seed_sources  (73 行 / 102 处)
     测试期（2026-06-11 ~ 07-21）流转记录，notes 多为 E2E/unit test/回归测试 标记，
     被引用的种源已不存在。记录本身含数量/日期/类型等业务内容 -> **清空引用，保留记录**
  2. tech_solution_scopes.solution_id -> tech_solutions  (15 / 26 行)
     纯子行，父方案不存在即毫无意义，且 solution_id 参与主键无法置空 -> **删除子行**
  3. seed_sources.stock_instance_id -> inventory_stock  (5)
     这 5 条种源本身已是软删除状态，指向的库存实例已移除 -> **清空引用**
  4. seed_sources.parent_source_id -> seed_sources  (1)
     一条未删除种源的父系指向已不存在 -> **清空引用**（断开孤立血缘）

注：清空引用只把外键列置 NULL，不动 quantity / circulation_date / notes 等业务字段。

用法：
  cd server && python scripts/repair_dangling_fks.py --yes
  （不带 --yes 只做预演，不写任何数据）
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

# 清空引用：(说明, UPDATE 语句)
NULL_OUT = [
    ('crop_circulation_records.parent_source_id',
     '''UPDATE crop_circulation_records SET parent_source_id = NULL
        WHERE parent_source_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM seed_sources s WHERE s.id = crop_circulation_records.parent_source_id)'''),
    ('crop_circulation_records.new_source_id',
     '''UPDATE crop_circulation_records SET new_source_id = NULL
        WHERE new_source_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM seed_sources s WHERE s.id = crop_circulation_records.new_source_id)'''),
    ('seed_sources.stock_instance_id',
     '''UPDATE seed_sources SET stock_instance_id = NULL
        WHERE stock_instance_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM inventory_stock i WHERE i.id = seed_sources.stock_instance_id)'''),
    ('seed_sources.parent_source_id',
     '''UPDATE seed_sources SET parent_source_id = NULL
        WHERE parent_source_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM seed_sources p WHERE p.id = seed_sources.parent_source_id)'''),
]

# 删除无意义子行：(说明, DELETE 语句)
DELETE_ROWS = [
    ('tech_solution_scopes（父方案不存在）',
     '''DELETE FROM tech_solution_scopes
        WHERE NOT EXISTS (SELECT 1 FROM tech_solutions s WHERE s.id = tech_solution_scopes.solution_id)'''),
]


def mb(n: int) -> str:
    return '%.2f MB' % (n / 1048576)


def fk_violations(conn: sqlite3.Connection) -> int:
    try:
        cur = conn.execute('PRAGMA foreign_key_check')
        return len(cur.fetchall())
    except Exception:
        return -1


def main() -> int:
    parser = argparse.ArgumentParser(description='修复悬空外键引用')
    parser.add_argument('--yes', action='store_true', help='确认执行（不加则只预演）')
    parser.add_argument('--no-backup', action='store_true', help='跳过自动备份（不推荐）')
    args = parser.parse_args()

    db_path = os.path.abspath(DB_PATH)
    if not os.path.exists(db_path):
        print(f'[FAIL] 找不到数据库：{db_path}')
        return 1

    size_before = os.path.getsize(db_path)
    conn = sqlite3.connect(db_path)
    conn.execute('PRAGMA foreign_keys = OFF')  # 由脚本自行保证一致性，避免边改边校验

    before = fk_violations(conn)
    print('-' * 62)
    print('  悬空外键修复')
    print('-' * 62)
    print(f'  数据库          : {db_path}')
    print(f'  文件大小        : {mb(size_before)}')
    print(f'  当前违规处数    : {before}')
    print()

    # 预演：统计每条语句会命中的行数
    plan = []
    for label, sql in NULL_OUT + DELETE_ROWS:
        # 用 SELECT COUNT(*) 复现同样的 WHERE
        where = sql.split('WHERE', 1)[1]
        table = sql.split('UPDATE', 1)[1].split('SET', 1)[0].strip() if sql.startswith('UPDATE') \
            else sql.split('FROM', 1)[1].split('WHERE', 1)[0].strip()
        probe = f'SELECT COUNT(*) FROM {table} WHERE {where}'
        n = conn.execute(probe).fetchone()[0]
        plan.append((label, sql, n, '清空引用' if sql.startswith('UPDATE') else '删除行'))
        print(f'  [{plan[-1][3]}] {label:<44} {n:>4} 行')
    print()

    if not args.yes:
        print('[INFO] 预演模式：未做任何修改。确认后请加 --yes 重新执行。')
        conn.close()
        return 0

    # ---- 备份 ----
    if not args.no_backup:
        stamp = datetime.now().strftime('%Y%m%d%H%M%S')
        backup = f'{db_path}.backup-pre-fkrepair-{stamp}'
        conn.close()
        shutil.copy2(db_path, backup)
        print(f'[OK] 已备份 -> {os.path.basename(backup)}  ({mb(os.path.getsize(backup))})')
        conn = sqlite3.connect(db_path)
        conn.execute('PRAGMA foreign_keys = OFF')

    # ---- 执行 ----
    for label, sql, _, kind in plan:
        cur = conn.execute(sql)
        print(f'[OK] {kind} {label} -> {cur.rowcount} 行')
    conn.commit()

    print('[..] VACUUM 回收空间...')
    conn.execute('VACUUM')
    conn.commit()

    # ---- 校验 ----
    after = fk_violations(conn)
    integrity = conn.execute('PRAGMA integrity_check').fetchone()[0]
    conn.close()

    size_after = os.path.getsize(db_path)
    print()
    print('-' * 62)
    print(f'  违规处数     : {before} -> {after}')
    print(f'  完整性校验   : {integrity}')
    print(f'  文件大小     : {mb(size_before)} -> {mb(size_after)}')
    print('-' * 62)

    if integrity != 'ok':
        print('[FAIL] 完整性校验未通过，请从备份恢复！')
        return 2
    if after != 0:
        print('[WARN] 仍有悬空引用，请检查是否有未覆盖的关系')
        return 3

    print('[OK] 修复完成，foreign_key_check 已干净')
    return 0


if __name__ == '__main__':
    sys.exit(main())
