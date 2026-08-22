"""
员工历史任务回溯录入脚本
2026-08-22：M1.5 数据扩充

场景：V1.1 只有 6 员工，AI-01/02 训练样本不足
降级方案：模板化生成历史任务，让员工确认/修改后导入

- 每个员工 80 行历史任务 = 6 × 80 = 480 行
- 覆盖 12 个月（2025-09 ~ 2026-08）

用法：
  cd server && python scripts/employee_history_template.py [--export-csv] [--import]
"""

import sqlite3
import random
import argparse
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = r'D:/TMcrop/yuanxingtu/V1.1/server/data/yuanxingtu.db'

TASK_TYPES = ['灌溉', '施肥', '采收', '种植', '巡查', '喷药', '修剪', '设备维护', '除草', '运输']
PRIORITIES = ['urgent', 'high', 'normal', 'normal', 'normal', 'low']


def generate_history(employees: list) -> list:
    """生成历史任务（每员工 80 条）"""
    records = []
    end_date = datetime(2026, 8, 22)
    start_date = end_date - timedelta(days=365)

    for emp_id, emp_name in employees:
        for i in range(80):
            day_offset = random.randint(0, 364)
            task_date = start_date + timedelta(days=day_offset)
            task_type = random.choice(TASK_TYPES)
            priority = random.choice(PRIORITIES)
            estimated_hours = round(random.uniform(1, 8), 1)
            actual_hours = round(estimated_hours * random.uniform(0.85, 1.25), 1)
            completed = task_date < end_date - timedelta(days=random.randint(0, 30))
            records.append({
                'task_code': f'EMP-{emp_id}-{i:03d}',
                'task_title': f'{emp_name}-{task_type}',
                'task_type': task_type,
                'task_content': f'历史回溯：{emp_name} 在 {task_date.date()} 完成 {task_type}',
                'status': 'completed' if completed else 'in_progress',
                'priority': priority,
                'assignee_id': emp_id,
                'assignee_name': emp_name,
                'estimated_hours': estimated_hours,
                'actual_hours': actual_hours if completed else None,
                'completed_at': task_date.isoformat() if completed else None,
                'plan_date': task_date.isoformat().split('T')[0],
                'create_time': task_date.isoformat(),
                'synthetic': 1,
                'source_problem_id': None,
                'source_inspection_id': None,
            })
    return records


def export_csv(records: list, output_path: str):
    """导出 CSV（员工确认/修改后导入）"""
    import csv
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        if not records:
            return
        writer = csv.DictWriter(f, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
    print(f'[CSV 导出] {output_path} ({len(records)} 行)')


def import_records(records: list):
    """直接导入到 farm_tasks 表"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    inserted = 0
    for r in records:
        try:
            cur.execute('''
                INSERT INTO farm_tasks (
                    task_code, task_title, task_type, task_content,
                    status, priority, assignee_id, assignee_name,
                    estimated_hours, actual_hours, completed_at,
                    plan_date, create_time, synthetic
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                r['task_code'], r['task_title'], r['task_type'], r['task_content'],
                r['status'], r['priority'], r['assignee_id'], r['assignee_name'],
                r['estimated_hours'], r['actual_hours'], r['completed_at'],
                r['plan_date'], r['create_time'], r['synthetic'],
            ))
            inserted += 1
        except Exception as e:
            print(f'[跳过] {r["task_code"]}: {e}')
    conn.commit()
    conn.close()
    print(f'[DB 导入] {inserted} 条')


def main():
    parser = argparse.ArgumentParser(description='员工历史任务回溯')
    parser.add_argument('--export-csv', action='store_true', help='导出 CSV 模板')
    parser.add_argument('--import', action='store_true', dest='do_import', help='直接导入 DB（无需员工确认）')
    parser.add_argument('--output', default='data/employee_history_template.csv')
    args = parser.parse_args()

    print('═' * 60)
    print('  员工历史任务回溯录入')
    print('═' * 60)

    # 获取在职员工
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM employees WHERE status IN ('在职', 'active')")
    employees = cur.fetchall()
    conn.close()

    if not employees:
        print('❌ 无在职员工')
        return

    print(f'[员工] {len(employees)} 个 → {len(employees) * 80} 行历史任务')

    records = generate_history(employees)

    if args.export_csv:
        output_path = Path(__file__).parent.parent / args.output
        output_path.parent.mkdir(parents=True, exist_ok=True)
        export_csv(records, str(output_path))
    elif args.do_import:
        import_records(records)
        print('\n[完成] 历史任务已导入 DB（synthetic=1 标记）')
    else:
        # 默认：导出 CSV
        output_path = Path(__file__).parent.parent / 'data/employee_history_template.csv'
        output_path.parent.mkdir(parents=True, exist_ok=True)
        export_csv(records, str(output_path))
        print('\n提示：员工确认/修改后用 --import 直接导入 DB')
        print('      或：cd server && npx tsx 写导入脚本调用 employee_history_template.py')


if __name__ == '__main__':
    main()
