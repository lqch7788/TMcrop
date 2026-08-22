"""
AI-06 工时预测 — 真实 ML 训练脚本（torch MLP 回归）
2026-08-22：替换规则 baseline，训练数据来自 farm_tasks 真实表（含 synthetic 历史回溯）

用法：
  cd server && python tools/ml/train_workhour_mlp.py

输出：
  server/models/workhour.onnx        — ONNX 模型（Node 侧 onnxruntime 加载推理）
  server/models/workhour_meta.json   — 特征顺序 / 标准化参数 / 训练指标
"""

import json
import math
import sqlite3
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

DB_PATH = r'D:/TMcrop/yuanxingtu/V1.1/server/data/yuanxingtu.db'
MODEL_DIR = Path(r'D:/TMcrop/yuanxingtu/V1.1/server/models')
MODEL_PATH = MODEL_DIR / 'workhour_weights.json'
META_PATH = MODEL_DIR / 'workhour_meta.json'

# 与业务枚举对齐（Node 侧推理必须一致）
TASK_TYPES = ['灌溉', '施肥', '采收', '种植', '巡查', '喷药', '修剪', '设备维护', '除草', '运输']
PRIORITIES = ['urgent', 'high', 'normal', 'low']

EPOCHS = 300
LR = 0.01
SEED = 42


def load_data():
    """读取 farm_tasks 中有实际工时的行"""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute('''
        SELECT task_type, priority, estimated_hours, rework_count, actual_hours
        FROM farm_tasks
        WHERE actual_hours IS NOT NULL AND actual_hours > 0
    ''').fetchall()
    conn.close()
    return rows


def build_features(rows):
    """特征工程：task_type one-hot(10) + priority one-hot(4) + estimated_hours + rework_count = 16 维"""
    X = []
    y = []
    for task_type, priority, est, rework, actual in rows:
        vec = [1.0 if task_type == t else 0.0 for t in TASK_TYPES]
        vec += [1.0 if priority == p else 0.0 for p in PRIORITIES]
        vec += [float(est or 0), float(rework or 0)]
        X.append(vec)
        y.append(float(actual))
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


class WorkhourMLP(nn.Module):
    """工时预测 MLP：16 → 32 → 16 → 1"""

    def __init__(self, n_features: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_features, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
        )

    def forward(self, x):
        return self.net(x)


def train(X, y):
    """训练 + 返回 (model, metrics)"""
    torch.manual_seed(SEED)

    # 训练/验证切分（80/20）
    n = len(X)
    idx = torch.randperm(n)
    n_train = int(n * 0.8)
    X_train, X_val = X[idx[:n_train]], X[idx[n_train:]]
    y_train, y_val = y[idx[:n_train]], y[idx[n_train:]]
    # torch 2.11：numpy 不再隐式转 Tensor，显式转换
    X_train, X_val = torch.from_numpy(X_train), torch.from_numpy(X_val)
    y_train, y_val = torch.from_numpy(y_train), torch.from_numpy(y_val)

    model = WorkhourMLP(X.shape[1])
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    loss_fn = nn.MSELoss()

    best_val_loss = float('inf')
    best_state = None
    for epoch in range(EPOCHS):
        model.train()
        opt.zero_grad()
        pred = model(X_train).squeeze(-1)
        loss = loss_fn(pred, y_train)
        loss.backward()
        opt.step()

        # 每 50 轮验证一次
        if (epoch + 1) % 50 == 0:
            model.eval()
            with torch.no_grad():
                vp = model(X_val).squeeze(-1)
                vloss = loss_fn(vp, y_val)
            if vloss < best_val_loss:
                best_val_loss = vloss
                best_state = {k: v.clone() for k, v in model.state_dict().items()}
            print(f'  epoch {epoch+1}/{EPOCHS}  train_loss={loss.item():.4f}  val_loss={vloss.item():.4f}')

    if best_state:
        model.load_state_dict(best_state)

    # 验证集评估（MAPE）
    model.eval()
    with torch.no_grad():
        vp = model(X_val).squeeze(-1).numpy()
        vp = np.maximum(vp, 0.1)  # 预测值下限保护
        mape = float(np.mean(np.abs((vp - y_val.numpy()) / y_val.numpy())) * 100)
        rmse = float(np.sqrt(np.mean((vp - y_val.numpy()) ** 2)))

    return model, {'mape_pct': round(mape, 2), 'rmse_hours': round(rmse, 2), 'n_samples': n}


def export_weights(model):
    """导出权重 JSON（Node 侧纯 JS 前向传播推理，零依赖）"""
    state = model.state_dict()
    # 按层顺序导出 fc1/fc2/fc3 的 weight+bias（Dropout 推理时不生效，不导出）
    export = {}
    layer_names = ['net.0', 'net.3', 'net.5']  # Linear(16→32) / Linear(32→16) / Linear(16→1)
    for i, ln in enumerate(layer_names, 1):
        w = state[f'{ln}.weight'].detach().numpy()
        b = state[f'{ln}.bias'].detach().numpy()
        export[f'fc{i}_w'] = w.tolist()
        export[f'fc{i}_b'] = b.tolist()
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_PATH.write_text(json.dumps(export), encoding='utf-8')
    print(f'OK 权重导出: {MODEL_PATH} ({MODEL_PATH.stat().st_size / 1024:.1f} KB)')


def main():
    print('═' * 60)
    print('  AI-06 工时预测 MLP 训练（torch → ONNX）')
    print('═' * 60)

    rows = load_data()
    print(f'[数据] farm_tasks 实际工时样本: {len(rows)} 行')
    if len(rows) < 100:
        print('ERR 样本过少，无法训练')
        return

    X, y = build_features(rows)
    print(f'[特征] 维度 {X.shape[1]}（task_type one-hot 10 + priority one-hot 4 + 数值 2）')

    model, metrics = train(X, y)
    print(f'\n[指标] MAPE={metrics["mape_pct"]}%  RMSE={metrics["rmse_hours"]}h  (n={metrics["n_samples"]})')

    meta = {
        'model_version': '1.0.0-mlp',
        'model_type': 'onnx-mlp',
        'task_types': TASK_TYPES,
        'priorities': PRIORITIES,
        'feature_dim': int(X.shape[1]),
        'metrics': metrics,
        'trained_at': '2026-08-22',
    }
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'OK 元数据: {META_PATH}')

    export_weights(model)
    print('\n[完成] Node 侧纯 JS 加载 workhour_weights.json 推理')


if __name__ == '__main__':
    main()
