"""
M1.5 历史任务模拟扩充脚本（不依赖网络）
2026-08-22：立刻给 AI-06 提供 500 行 synthetic 训练数据

场景：V1.1 现有 84 行任务太少，AI-06 baseline MAPE 33.61%。
真实数据扩充需要：
- 网络下载公开数据集（当前代理阻断）
- 员工手工回溯录入（需协调 6 人）
- IoT 硬件部署（需 9060 元预算）

本脚本作为**过渡方案**：基于现有 84 行任务的统计特征 + 合理领域知识
生成 500 行 synthetic 任务，**明确标注 synthetic=1**（避免与真数据混淆）。

用法：
  cd server && python tools/ml/synthesize_historical_tasks.py --count 500
"""

import sqlite3
import json
import random
import argparse
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = r'D:/TMcrop/yuanxingtu/V1.1/server/data/yuanxingtu.db'

# 任务类型 + 典型工时分布（基于农业常识，非真实数据）
TASK_TYPE_PROFILE = {
    '灌溉':     {'mean': 2.5, 'std': 1.0, 'unit': '区域'},
    '施肥':     {'mean': 4.0, 'std': 1.5, 'unit': '区域'},
    '采收':     {'mean': 6.0, 'std': 2.0, 'unit': '区域'},
    '种植':     {'mean': 8.0, 'std': 2.5, 'unit': '区域'},
    '巡查':     {'mean': 1.5, 'std': 0.5, 'unit': '温室'},
    '喷药':     {'mean': 3.5, 'std': 1.2, 'unit': '区域'},
    '修剪':     {'mean': 5.0, 'std': 1.8, 'unit': '区域'},
    '清洁':     {'mean': 2.0, 'std': 0.8, 'unit': '温室'},
    '设备维护': {'mean': 4.5, 'std': 2.0, 'unit': '设备'},
    '运输':     {'mean': 1.0, 'std': 0.4, 'unit': '批次'},
}

PRIORITY_FACTOR = {
    'urgent': 0.7,   # 赶工压缩
    'high': 0.85,
    'normal': 1.0,
    'low': 1.2,
}


def gauss_clipped(mu: float, sigma: float, low: float = 0.5) -> float:
    """高斯分布，截断到下限"""
    return max(low, random.gauss(mu, sigma))


def synthesize_one(seq: int, base_date: datetime, employee_ids: list[str], greenhouse_ids: list[str]):
    """生成一条 synthetic 任务记录"""
    task_type = random.choice(list(TASK_TYPE_PROFILE.keys()))
    profile = TASK_TYPE_PROFILE[task_type]
    priority = random.choices(['urgent', 'high', 'normal', 'low'], weights=[1, 3, 5, 1])[0]
    factor = PRIORITY_FACTOR[priority]

    estimated_hours = round(gauss_clipped(profile['mean'] * factor, profile['std'] * 0.3), 1)

    # 实际工时：estimated * (1 + 正态扰动 + 返工)
    noise = random.gauss(0, 0.15)  # ±15% 噪声
    rework_count = random.choices([0, 0, 0, 1, 2], weights=[5, 4, 3, 2, 1])[0]
    rework_factor = 1 + (rework_count * 0.3)
    actual_hours = round(estimated_hours * (1 + noise) * rework_factor, 1)

    # 时间分布：过去 2 年（让 AI 有时间跨度感）
    days_ago = random.randint(1, 730)
    completed_at = base_date - timedelta(days=days_ago)
    plan_date = completed_at - timedelta(days=random.randint(0, 2))

    ratio = round(actual_hours / max(estimated_hours, 0.1), 3)

    return {
        'task_code': f'SYN-{seq:04d}',
        'task_title': f'{task_type}任务 #{seq}',
        'task_type': task_type,
        'task_content': f'synthetic {task_type} task for AI-06 training',
        'status': 'completed',
        'priority': priority,
        'progress': 100,
        'estimated_hours': estimated_hours,
        'estimated_days': round(estimated_hours / 8, 1),
        'actual_hours': actual_hours,
        'actual_hours_recorded_at': completed_at.isoformat(),
        'actual_hours_recorded_by': random.choice(employee_ids),
        'estimated_vs_actual_ratio': ratio,
        'rework_count': rework_count,
        'plan_date': plan_date.isoformat().split('T')[0],
        'completed_at': completed_at.isoformat(),
        'create_time': plan_date.isoformat(),
        'update_time': completed_at.isoformat(),
        'assignee_id': random.choice(employee_ids),
        'greenhouse_id': random.choice(greenhouse_ids),
        'type_name': task_type,
        'synthetic': 1,  # 关键标记：标识这是合成数据
    }


def main():
    parser = argparse.ArgumentParser(description='AI-06 synthetic 训练数据扩充')
    parser.add_argument('--count', type=int, default=500, help='生成数量（默认 500）')
    parser.add_argument('--clear-first', action='store_true', help='先清掉 synthetic=1 的旧数据')
    args = parser.parse_args()

    print('═' * 60)
    print(f'  M1.5 synthetic 历史任务扩充（{args.count} 行）')
    print('═' * 60)

    conn = sqlite3.connect(DB_PATH)
    try:
        # 1. 准备：employee_ids + greenhouse_ids（从 V1.1 现有数据获取）
        employees = [r[0] for r in conn.execute('SELECT id FROM employees').fetchall()]
        greenhouses = [r[0] for r in conn.execute('SELECT id FROM greenhouses LIMIT 21').fetchall()]
        if not employees:
            employees = ['E001', 'E002', 'E003', 'E004', 'E005', 'E006']
        if not greenhouses:
            greenhouses = [f'G{i:03d}' for i in range(1, 22)]

        print(f'[数据准备] employees: {len(employees)}, greenhouses: {len(greenhouses)}')

        # 2. 检查表是否有 synthetic 列（如没有，加列）
        cols = [r[1] for r in conn.execute('PRAGMA table_info(farm_tasks)').fetchall()]
        if 'synthetic' not in cols:
            print('[迁移] 添加 synthetic 列（标记合成数据）')
            conn.execute('ALTER TABLE farm_tasks ADD COLUMN synthetic INTEGER DEFAULT 0')

        # 3. 清掉旧 synthetic 数据（可选）
        if args.clear_first:
            deleted = conn.execute('DELETE FROM farm_tasks WHERE synthetic = 1').rowcount
            print(f'[清理] 删除旧 synthetic 数据: {deleted} 行')

        # 4. 检查现有 synthetic 行数
        existing = conn.execute('SELECT COUNT(*) FROM farm_tasks WHERE synthetic = 1').fetchone()[0]
        if existing > 0:
            print(f'⚠️  已有 synthetic 数据 {existing} 行，不重复生成（如需重建请加 --clear-first）')
            conn.commit()
            return

        # 5. 生成 synthetic 数据
        base_date = datetime(2026, 8, 22)  # 当前日期
        random.seed(42)  # 可复现

        rows = []
        for i in range(args.count):
            row = synthesize_one(i + 1, base_date, employees, greenhouses)
            rows.append(row)

        print(f'[生成] {len(rows)} 行 synthetic 任务')

        # 6. 写入 DB（按表列动态构建 INSERT）
        cursor = conn.cursor()
        cols = [r[1] for r in conn.execute('PRAGMA table_info(farm_tasks)').fetchall()]
        placeholders = ', '.join(['?'] * len(cols))
        col_names = ', '.join(cols)

        # 只插入实际存在的列
        insert_rows = []
        for row in rows:
            insert_rows.append(tuple(row.get(c) for c in cols))

        cursor.executemany(f'INSERT INTO farm_tasks ({col_names}) VALUES ({placeholders})', insert_rows)
        conn.commit()

        # 7. 验证
        new_count = conn.execute('SELECT COUNT(*) FROM farm_tasks WHERE synthetic = 1').fetchone()[0]
        real_count = conn.execute('SELECT COUNT(*) FROM farm_tasks WHERE synthetic = 0 OR synthetic IS NULL').fetchone()[0]

        print()
        print('[验证]')
        print(f'  Real tasks:      {real_count}')
        print(f'  Synthetic tasks: {new_count}')
        print(f'  Total:           {real_count + new_count}')
        print()
        print('[工时分布]')
        for row in conn.execute('''
            SELECT task_type, COUNT(*) AS n,
                   ROUND(AVG(actual_hours), 2) AS mean_h,
                   ROUND(MIN(actual_hours), 1) AS min_h,
                   ROUND(MAX(actual_hours), 1) AS max_h
            FROM farm_tasks
            WHERE synthetic = 1 AND actual_hours IS NOT NULL
            GROUP BY task_type
            ORDER BY n DESC
        '''):
            print(f'  {row[0]:10} n={row[1]:4}  mean={row[2]}h  range={row[3]}-{row[4]}h')

        print()
        print('═' * 60)
        print('  ✅ 完成。AI-06 现在有', new_count, '行训练数据')
        print('  ⚠️  标记 synthetic=1，避免与真实数据混淆')
        print('═' * 60)

    finally:
        conn.close()


if __name__ == '__main__':
    main()
