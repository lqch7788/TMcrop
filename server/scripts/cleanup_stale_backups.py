"""
清理 server/data 根目录下的历史备份快照（2026-09-19）

背景：
  排查 DB 体积来源时发现 server/data/ 根目录堆了 28 个 *.backup* / *.before-* 文件，
  合计约 400 MB。它们不参与系统运行 —— 逐个做过全仓引用搜索（见下）。

为什么可以删（逐文件全仓 grep 的结论）：
  · 没有任何代码扫描父级 data/ 目录：3 处 readdirSync 全指向 data/backups 子目录
    （backupDatabase.ts / schedulerService.ts），另一处是扫 .tsx 源码的检查脚本
  · /api/backup 的 BACKUP_DIR 也只覆盖 data/backups
  · .gitignore 第 103/104/116 行已把它们排除在版本控制外（当初即定位为本地临时产物）
  · 前端「备份中心」页面读的是 data/backups，看不到这些文件

KEEP_LIST（有引用，绝不删）：
  · yuanxingtu.db.backup
      server/scripts/db-fixes/migrateData.ts:25 用 fs.readFileSync 读它 —— 真代码依赖
  · yuanxingtu.db.backup-pre-migrateV03-1788172969401
      public/docs/agronomy-roadmap/12-stage-0-v0.3-progress.md:118 记录了该备份
  · yuanxingtu.db.before-migrate-20260725.db
      docs/superpowers/plans/2026-07-25-zone-planting-info-ownership.md:223 记录了它

不动的东西：
  · yuanxingtu.db（生产库）、yuanxingtu-seed.db（种子库脚本产物）
  · data/backups/ 整个子目录（应用自己的备份中心）
  · data/images/

用法：
  cd server && python scripts/cleanup_stale_backups.py          # 预演
  cd server && python scripts/cleanup_stale_backups.py --yes    # 执行
"""

import argparse
import os
import subprocess
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
REPO_ROOT = os.path.abspath(os.path.join(DATA_DIR, '..', '..'))


def git_tracked_files() -> set:
    """
    返回 git 已跟踪的文件路径（相对仓库根，正斜杠）。

    2026-09-19 教训：有 6 个备份文件虽然命中 .gitignore 规则，但它们**先被提交、
    之后才加的忽略规则**，所以 git 仍在跟踪。当时脚本把它们连同工作区一起删了。
    这里加一道闸：凡是 git 跟踪的文件一律不删 —— 忽略规则 ≠ 未跟踪。
    取不到 git（未安装/非仓库）时返回空集，并在调用处提示。
    """
    try:
        r = subprocess.run(
            ['git', 'ls-files'],
            cwd=REPO_ROOT, capture_output=True, text=True,
            encoding='utf-8', errors='replace',
        )
        if r.returncode != 0:
            return set()
        return {line.strip().replace('\\', '/') for line in (r.stdout or '').splitlines() if line.strip()}
    except Exception:
        return set()

# 已确认被代码/文档引用，禁止删除
KEEP_LIST = {
    'yuanxingtu.db.backup',
    'yuanxingtu.db.backup-pre-migrateV03-1788172969401',
    'yuanxingtu.db.before-migrate-20260725.db',
}

# 生产库与脚本产物，必须保留
NEVER_DELETE = {
    'yuanxingtu.db',
    'yuanxingtu-seed.db',
}


def is_candidate(name: str) -> bool:
    if name in KEEP_LIST or name in NEVER_DELETE:
        return False
    return '.backup' in name or '.before' in name or name.startswith('yuanxingtu_backup')


def mb(n: float) -> str:
    return '%.2f MB' % (n / 1048576)


def main() -> int:
    parser = argparse.ArgumentParser(description='清理 data 目录下的历史备份快照')
    parser.add_argument('--yes', action='store_true', help='确认执行（不加则只预演）')
    args = parser.parse_args()

    if not os.path.isdir(DATA_DIR):
        print(f'[FAIL] 找不到目录：{DATA_DIR}')
        return 1

    tracked = git_tracked_files()
    if not tracked:
        print('[WARN] 读不到 git 跟踪列表（git 不可用或不在仓库内）——本次不做「已跟踪」检查')

    targets, skipped_tracked = [], []
    for name in sorted(os.listdir(DATA_DIR)):
        full = os.path.join(DATA_DIR, name)
        if not (os.path.isfile(full) and is_candidate(name)):
            continue
        # 忽略规则 ≠ 未跟踪：被 git 跟踪的文件绝不删（2026-09-19 教训）
        if ('server/data/' + name) in tracked:
            skipped_tracked.append(name)
            continue
        targets.append((name, os.path.getsize(full)))

    total = sum(s for _, s in targets)
    print('-' * 68)
    print('  历史备份快照清理')
    print('-' * 68)
    print(f'  目录       : {DATA_DIR}')
    print(f'  待删文件   : {len(targets)} 个，合计 {mb(total)}')
    print(f'  保留白名单 : {len(KEEP_LIST)} 个（有代码/文档引用）')
    print(f'  跳过(已跟踪): {len(skipped_tracked)} 个')
    print()
    if skipped_tracked:
        print('  以下文件受 git 跟踪，本次不删（需先 git rm 才能物理移除）：')
        for name in skipped_tracked:
            print('     ', name)
        print()
    for name, size in targets:
        print('   %9s  %s' % (mb(size), name))
    print()

    # 白名单文件必须仍在
    for name in KEEP_LIST:
        if not os.path.exists(os.path.join(DATA_DIR, name)):
            print(f'[WARN] 白名单文件不存在（可能已被删）：{name}')
    print()

    if not args.yes:
        print('[INFO] 预演模式：未删除任何文件。确认后请加 --yes 重新执行。')
        return 0

    deleted, freed, failed = 0, 0, []
    for name, size in targets:
        try:
            os.remove(os.path.join(DATA_DIR, name))
            deleted += 1
            freed += size
        except Exception as e:
            failed.append((name, str(e)))

    print('-' * 68)
    print(f'  已删除   : {deleted} 个文件')
    print(f'  已释放   : {mb(freed)}')
    print('-' * 68)

    if failed:
        print('[WARN] 以下文件删除失败：')
        for name, err in failed:
            print(f'   {name}: {err}')
        return 2

    # 复核：生产库与白名单仍在
    print('[..] 复核关键文件是否完好...')
    ok = True
    for name in ['yuanxingtu.db'] + sorted(KEEP_LIST):
        p = os.path.join(DATA_DIR, name)
        if os.path.exists(p):
            print(f'   [OK] {name}  ({mb(os.path.getsize(p))})')
        else:
            print(f'   [FAIL] {name} 不见了！')
            ok = False

    if not ok:
        print('[FAIL] 关键文件缺失，请立即检查！')
        return 3

    print('[OK] 清理完成，生产库与有引用的备份均完好')
    return 0


if __name__ == '__main__':
    sys.exit(main())
