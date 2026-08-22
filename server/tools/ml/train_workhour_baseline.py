"""
AI-06 工时预测 baseline 验证 — 纯 numpy + pandas（不依赖 XGBoost）
2026-08-22：验证 V1.1 现有 84 行 farm_tasks 数据能否训出 baseline 准确率

用法：cd server && python tools/ml/train_workhour_baseline.py
"""

import sqlite3
import numpy as np
import pandas as pd
import json
import os
from pathlib import Path

# ============ 路径配置 ============
DB_PATH = r'D:/TMcrop/yuanxingtu/V1.1/server/data/yuanxingtu.db'
OUTPUT_DIR = Path(r'D:/TMcrop/yuanxingtu/V1.1/server/tools/ml/output')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_data():
    """从 V1.1 SQLite 导出 farm_tasks + employees + greenhouses

    注意：farm_tasks 表没有 actual_hours 列（2026-08-22 关键发现）
    - 只能用 estimated_hours 作为 proxy target
    - AI-06 MVP 需要先扩展 farm_tasks 表加 actual_hours 字段
    """
    conn = sqlite3.connect(DB_PATH)
    try:
        # farm_tasks 核心数据（2026-08-22 列名修正：code→task_code, type→task_type, area→area_name）
        tasks = pd.read_sql_query('''
            SELECT id, task_code, task_type, task_title, status, priority,
                   assignee_id, assignee_name, area_name,
                   estimated_hours, estimated_days,
                   plan_date, plan_time, completion_date, completed_at,
                   progress, rework_count, greenhouse_id
            FROM farm_tasks
            WHERE status IN ('completed', 'accepted', 'submitted', 'in_progress')
        ''', conn)
        print(f'[数据加载] farm_tasks (活跃任务): {len(tasks)} 行')

        # 计算 proxy 工时（estimated_hours * (1 + rework_count*0.2)）
        # 实际生产中 rework_count>0 表示多次返工，工时通常比预估多 20-50%
        tasks['proxy_actual_hours'] = tasks['estimated_hours'].fillna(1.0) * (1 + tasks['rework_count'].fillna(0) * 0.3)

        # 完成度 100% 的任务
        completed = tasks[tasks['progress'] >= 99]
        print(f'[数据加载] 完成度 ≥99%: {len(completed)} 行')

        # employees（用于技能匹配 + 工人效率）
        employees = pd.read_sql_query('''
            SELECT id, name, position_name, skills
            FROM employees
        ''', conn)
        print(f'[数据加载] employees: {len(employees)} 行')

        # greenhouses（用于区域面积）
        greenhouses = pd.read_sql_query('''
            SELECT id, name, area, greenhouse_type
            FROM greenhouses
        ''', conn)
        print(f'[数据加载] greenhouses: {len(greenhouses)} 行')

        return tasks, employees, greenhouses
    finally:
        conn.close()


def feature_engineering(tasks: pd.DataFrame, employees: pd.DataFrame, greenhouses: pd.DataFrame):
    """8 个特征工程"""
    df = tasks.copy()

    # F1: task_type 编码（2026-08-22 列名修正：type → task_type）
    task_type_map = {t: i for i, t in enumerate(df['task_type'].unique())}
    df['F1_task_type'] = df['task_type'].map(task_type_map)

    # F2: 区域名编码（proxy for area，因为 farm_tasks 没有 area 数字字段，只有 area_name）
    area_name_map = {a: i for i, a in enumerate(df['area_name'].dropna().unique())}
    df['F2_area'] = df['area_name'].map(area_name_map).fillna(-1)

    # F3: priority 编码 (urgent=3, high=2, normal=1, low=0)
    priority_map = {'urgent': 3, 'high': 2, 'normal': 1, 'low': 0}
    df['F3_priority'] = df['priority'].map(priority_map).fillna(1)

    # F4: worker_skill_match（简化版：1.0 = 已分配，其他 = 0.5）
    df['F4_skill_match'] = df['assignee_id'].notna().astype(float)

    # F5: historical_mean_hours（同类型任务历史平均 proxy_actual_hours）
    type_mean = df.groupby('task_type')['proxy_actual_hours'].mean().to_dict()
    df['F5_hist_mean'] = df['task_type'].map(type_mean).fillna(df['proxy_actual_hours'].mean())

    # F6: historical_std_hours
    type_std = df.groupby('task_type')['proxy_actual_hours'].std().fillna(0).to_dict()
    df['F6_hist_std'] = df['task_type'].map(type_std).fillna(0)

    # F7: worker_efficiency proxy（基于 skills 字段长度：技能越多越熟练）
    # 实际生产用 performance_score（V1.1 没这字段，简化用 skills 数量 proxy）
    def skills_count(skills_str):
        if pd.isna(skills_str) or not skills_str:
            return 0
        try:
            import json
            return len(json.loads(skills_str)) if skills_str.startswith('[') else skills_str.count(',') + 1
        except:
            return skills_str.count(',') + 1

    emp_skills = dict(zip(employees['id'], employees['skills'].apply(skills_count)))
    max_skills = max(emp_skills.values()) if emp_skills else 5
    emp_perf_proxy = {eid: min(1.0, cnt / max(max_skills, 1) + 0.5) for eid, cnt in emp_skills.items()}
    df['F7_worker_eff'] = df['assignee_id'].map(emp_perf_proxy).fillna(0.7)

    # F8: progress（任务进度 0-100，作为工时已用比例的 proxy）
    df['F8_progress'] = df['progress'].fillna(0)

    # Target: proxy_actual_hours（V1.1 缺 actual_hours，用 estimated_hours × (1 + rework*0.3) 作为 proxy）
    features = ['F1_task_type', 'F2_area', 'F3_priority', 'F4_skill_match',
                'F5_hist_mean', 'F6_hist_std', 'F7_worker_eff', 'F8_progress']

    # 检查缺失
    missing = [f for f in features if f not in df.columns]
    if missing:
        raise ValueError(f'缺失特征: {missing}')

    X = df[features].values.astype(float)
    y = df['proxy_actual_hours'].values.astype(float)

    # 过滤 y<=0
    valid = y > 0
    X = X[valid]
    y = y[valid]

    print(f'[特征工程] 有效样本数: {len(y)}, 特征数: {len(features)}')
    print(f'[特征工程] proxy_actual_hours 分布: mean={y.mean():.2f}, std={y.std():.2f}, min={y.min():.2f}, max={y.max():.2f}')

    return X, y, features


def train_baseline_linear(X: np.ndarray, y: np.ndarray, test_ratio: float = 0.3):
    """纯 numpy 线性回归 baseline"""
    n = len(y)
    if n < 10:
        return None  # 数据太少

    # 80/20 train/test split
    np.random.seed(42)
    indices = np.random.permutation(n)
    split = int(n * (1 - test_ratio))
    train_idx, test_idx = indices[:split], indices[split:]
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    # 标准化（避免数值尺度问题）
    X_mean, X_std = X_train.mean(axis=0), X_train.std(axis=0) + 1e-8
    y_mean = y_train.mean()
    X_train_norm = (X_train - X_mean) / X_std
    X_test_norm = (X_test - X_mean) / X_std
    y_train_norm = y_train - y_mean

    # 加偏置项
    X_train_b = np.column_stack([np.ones(len(X_train_norm)), X_train_norm])
    X_test_b = np.column_stack([np.ones(len(X_test_norm)), X_test_norm])

    # 最小二乘：beta = (X^T X)^-1 X^T y
    try:
        beta = np.linalg.lstsq(X_train_b, y_train_norm, rcond=None)[0]
    except Exception as e:
        print(f'[训练失败] {e}')
        return None

    # 预测
    y_pred_train_norm = X_train_b @ beta
    y_pred_test_norm = X_test_b @ beta
    y_pred_train = y_pred_train_norm + y_mean
    y_pred_test = y_pred_test_norm + y_mean

    # 评估指标
    def mape(true, pred):
        return np.mean(np.abs((true - pred) / np.maximum(true, 1e-8))) * 100
    def mae(true, pred):
        return np.mean(np.abs(true - pred))
    def r2(true, pred):
        ss_res = np.sum((true - pred) ** 2)
        ss_tot = np.sum((true - true.mean()) ** 2)
        return 1 - ss_res / max(ss_tot, 1e-8)

    metrics = {
        'train': {
            'n': len(y_train),
            'MAPE': mape(y_train, y_pred_train),
            'MAE': mae(y_train, y_pred_train),
            'R2': r2(y_train, y_pred_train),
        },
        'test': {
            'n': len(y_test),
            'MAPE': mape(y_test, y_pred_test),
            'MAE': mae(y_test, y_pred_test),
            'R2': r2(y_test, y_pred_test),
        },
        'coefficients': dict(zip(['bias'] + ['F1_task_type', 'F2_area', 'F3_priority', 'F4_skill_match',
                                       'F5_hist_mean', 'F6_hist_std', 'F7_worker_eff', 'F8_day_of_week'],
                                  beta.tolist())),
    }
    return metrics, y_test, y_pred_test, X_mean, X_std, y_mean, beta


def main():
    print('═' * 70)
    print('  AI-06 工时预测 baseline 验证（V1.1 现有数据）')
    print('═' * 70)
    print()

    # 1. 数据加载
    tasks, employees, greenhouses = load_data()
    print()

    if len(tasks) < 10:
        print(f'⚠️ 数据量太少（{len(tasks)} 行），无法训练 baseline')
        print('建议：等待 M1.5 数据准备扩充后再做 baseline 验证')
        return

    # 2. 特征工程
    X, y, feature_names = feature_engineering(tasks, employees, greenhouses)
    print()

    # 3. 训练 + 评估
    result = train_baseline_linear(X, y)
    if result is None:
        print('训练失败')
        return
    metrics, y_test, y_pred_test, X_mean, X_std, y_mean, beta = result
    print()

    # 4. 输出结果
    print('[Baseline 评估结果]')
    print(f'  训练集: n={metrics["train"]["n"]}, MAPE={metrics["train"]["MAPE"]:.2f}%, MAE={metrics["train"]["MAE"]:.2f}h, R²={metrics["train"]["R2"]:.4f}')
    print(f'  测试集: n={metrics["test"]["n"]}, MAPE={metrics["test"]["MAPE"]:.2f}%, MAE={metrics["test"]["MAE"]:.2f}h, R²={metrics["test"]["R2"]:.4f}')
    print()

    # 5. 特征重要性（系数绝对值）
    coef = metrics['coefficients']
    feat_importance = sorted(
        [(k, abs(v)) for k, v in coef.items() if k != 'bias'],
        key=lambda x: x[1], reverse=True
    )
    print('[特征重要性（线性回归系数绝对值）]')
    for feat, importance in feat_importance[:5]:
        print(f'  {feat}: {importance:.4f}')
    print()

    # 6. PPT 验收指标对比
    print('[PPT 验收指标对比]')
    test_mape = metrics['test']['MAPE']
    test_r2 = metrics['test']['R2']
    test_n = metrics['test']['n']
    if test_mape <= 20:
        print(f'  ✅ MAPE={test_mape:.2f}% ≤ 20%（达标，XGBoost 可进一步优化）')
    elif test_mape <= 30:
        print(f'  ⚠️ MAPE={test_mape:.2f}% (20-30%)，需要 XGBoost 优化')
    else:
        print(f'  🔴 MAPE={test_mape:.2f}% > 30%，需扩充数据（>1000 行）')

    if test_r2 >= 0.7:
        print(f'  ✅ R²={test_r2:.4f} ≥ 0.7（拟合度好）')
    elif test_r2 >= 0.3:
        print(f'  ⚠️ R²={test_r2:.4f} (0.3-0.7)，弱拟合')
    else:
        print(f'  🔴 R²={test_r2:.4f} < 0.3，拟合差')

    print(f'  测试样本: {test_n} 行（{len(y)} 总样本的 {test_n / len(y) * 100:.0f}%）')
    print()

    # 7. 保存报告
    report_path = OUTPUT_DIR / 'baseline_report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump({
            'date': '2026-08-22',
            'model_type': 'linear_regression_baseline',
            'data_source': 'V1.1 SQLite farm_tasks',
            'total_samples': len(y),
            'train_samples': metrics['train']['n'],
            'test_samples': metrics['test']['n'],
            'features': feature_names,
            'metrics': metrics,
            'ppt_target_mape': 20.0,
            'meets_target': test_mape <= 20,
        }, f, indent=2, ensure_ascii=False, default=str)
    print(f'[报告保存] {report_path}')
    print()

    # 8. 结论
    print('═' * 70)
    print('  结论')
    print('═' * 70)
    if test_mape <= 20:
        print(f'  ✅ V1.1 现有 {len(y)} 行数据 baseline 可行（MAPE {test_mape:.2f}%）')
        print('  → 建议立刻启动 AI-06 MVP 实施（W3-W5）')
    elif test_mape <= 30:
        print(f'  ⚠️ 线性回归 baseline MAPE {test_mape:.2f}% 未达 PPT 20% 目标')
        print(f'  → 需要 XGBoost + 更多数据（建议数据扩充到 ≥500 行）')
    else:
        print(f'  🔴 数据量严重不足（{len(y)} 行），baseline MAPE {test_mape:.2f}%')
        print(f'  → 必须等 M1.5 数据准备扩充后再启动 AI-06')


if __name__ == '__main__':
    main()
