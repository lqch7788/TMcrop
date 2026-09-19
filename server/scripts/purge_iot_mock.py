"""
IoT mock 数据清理脚本 —— 与 generate_iot_mock.py 配对

背景（2026-09-19）：
  generate_iot_mock.py（2026-08-22 运行）向 iot_sensor_readings 写入
  21 温室 × 4 传感器 × 90 天 × 6 次/天 = 45,360 条 mock 读数（约 4.46 MB），
  它上面的 3 个索引又占约 7.35 MB —— 合计约 11.8 MB，占整个 DB（20 MB）的 59%。
  排查结论：这是全库唯一的大块数据来源，且没有任何自动调用点，属一次性手动脚本产物。

本脚本做什么：
  1. 停止 SQLite 写入（请先停后端：它持有内存副本，会在下次 saveDatabase() 覆盖文件）
  2. 删除 iot_sensor_readings 全表数据
  3. 删除该表上的 3 个索引
  4. VACUUM 回收文件空间
  5. 做完整性校验

副作用（已与用户确认）：
  AI-04 生长预测、AI-05 病虫害预警、AI-10 生长状态 失去环境数据源，
  会返回「无传感器数据」提示（代码中已有该分支，不会崩）。
  如需恢复：重跑 generate_iot_mock.py 即可重新生成。

用法：
  cd server && python scripts/purge_iot_mock.py --yes
  （不带 --yes 只做预演，不写任何数据）
"""

import argparse
import os
import shutil
import sqlite3
import sys
from datetime import datetime

# Windows 控制台默认 GBK，emoji 会触发 UnicodeEncodeError 中断脚本（2026-09-19 踩过）。
# 统一输出为 UTF-8 并对无法编码的字符降级，而不是让脚本中途崩掉。
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'yuanxingtu.db')
TARGET_TABLE = 'iot_sensor_readings'
TARGET_INDEXES = ['idx_isr_device_time', 'idx_isr_greenhouse_time', 'idx_isr_type_time']


def mb(n: int) -> str:
    return '%.2f MB' % (n / 1048576)


def main() -> int:
    parser = argparse.ArgumentParser(description='清理 IoT mock 数据并回收空间')
    parser.add_argument('--yes', action='store_true', help='确认执行（不加则只预演）')
    parser.add_argument('--no-backup', action='store_true', help='跳过自动备份（不推荐）')
    args = parser.parse_args()

    db_path = os.path.abspath(DB_PATH)
    if not os.path.exists(db_path):
        print(f'[FAIL] 找不到数据库：{db_path}')
        return 1

    size_before = os.path.getsize(db_path)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # ---- 采集现状 ----
    cur.execute(f'SELECT COUNT(*) FROM {TARGET_TABLE}')
    rows = cur.fetchone()[0]

    existing_idx = []
    for name in TARGET_INDEXES:
        cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?", (name,))
        if cur.fetchone()[0]:
            existing_idx.append(name)

    print('-' * 62)
    print('  IoT mock 数据清理')
    print('-' * 62)
    print(f'  数据库       : {db_path}')
    print(f'  当前文件大小 : {mb(size_before)}')
    print(f'  待删表       : {TARGET_TABLE}  共 {rows:,} 行')
    print(f'  待删索引     : {", ".join(existing_idx) if existing_idx else "（无）"}')
    print()

    if rows == 0 and not existing_idx:
        print('[OK] 无需清理：表已为空且索引不存在')
        conn.close()
        return 0

    if not args.yes:
        print('[INFO]  预演模式：未做任何修改。确认后请加 --yes 重新执行。')
        conn.close()
        return 0

    # ---- 备份 ----
    if not args.no_backup:
        stamp = datetime.now().strftime('%Y%m%d%H%M%S')
        backup = f'{db_path}.backup-pre-iotpurge-{stamp}'
        conn.close()
        shutil.copy2(db_path, backup)
        print(f'[OK] 已备份 -> {os.path.basename(backup)}  ({mb(os.path.getsize(backup))})')
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

    # ---- 执行清理 ----
    cur.execute(f'DELETE FROM {TARGET_TABLE}')
    deleted = cur.rowcount
    conn.commit()
    print(f'[OK] 已删除 {deleted:,} 行')

    for name in existing_idx:
        cur.execute(f'DROP INDEX IF EXISTS {name}')
        print(f'[OK] 已删除索引 {name}')
    conn.commit()

    print('[..] VACUUM 回收空间...')
    cur.execute('VACUUM')
    conn.commit()

    # ---- 校验 ----
    cur.execute('PRAGMA integrity_check')
    integrity = cur.fetchone()[0]
    cur.execute(f'SELECT COUNT(*) FROM {TARGET_TABLE}')
    remain = cur.fetchone()[0]
    conn.close()

    size_after = os.path.getsize(db_path)
    print()
    print('-' * 62)
    print(f'  完整性校验   : {integrity}')
    print(f'  表剩余行数   : {remain:,}')
    print(f'  文件大小     : {mb(size_before)} -> {mb(size_after)}  （节省 {mb(size_before - size_after)}）')
    print('-' * 62)

    if integrity != 'ok':
        print('[FAIL] 完整性校验未通过，请从备份恢复！')
        return 2
    if remain != 0:
        print('[WARN]  表中仍有残留行，请检查')
        return 3

    print('[OK] 清理完成。如需恢复 mock 数据：python scripts/generate_iot_mock.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
