"""
AI-09 模型验证脚本 — 多类别抽样测试
用法: python tools/ml/verify_pest_model.py
输出: 每类抽样 5 张预测 + 总体准确率（目标 ≥85%）
"""
import sys
import json
import subprocess
import base64
import random
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SERVER_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = SERVER_ROOT / 'data' / 'images' / 'synthetic'
MODEL_PATH = SERVER_ROOT / 'models' / 'pest_image.pt'

SAMPLE_PER_CLASS = 5
TARGET_ACC = 0.85


def main() -> int:
    if not MODEL_PATH.exists():
        print(f'[ERROR] 模型不存在: {MODEL_PATH}')
        return 1
    if not DATA_DIR.exists():
        print(f'[ERROR] 数据目录不存在: {DATA_DIR}')
        return 1

    classes = sorted([d.name for d in DATA_DIR.iterdir() if d.is_dir()])
    print(f'验证类别: {len(classes)} 类（每类抽样 {SAMPLE_PER_CLASS} 张）')

    total = 0
    correct = 0
    per_class = []

    for cls in classes:
        jpgs = list((DATA_DIR / cls).glob('*.jpg'))
        random.seed(42)
        samples = random.sample(jpgs, min(SAMPLE_PER_CLASS, len(jpgs)))
        cls_correct = 0
        for jpg in samples:
            b64 = base64.b64encode(jpg.read_bytes()).decode()
            proc = subprocess.run(
                ['python', str(SERVER_ROOT / 'tools' / 'ml' / 'predict_pest_image.py')],
                input=b64, capture_output=True, text=True, encoding='utf-8',
            )
            try:
                pred = json.loads(proc.stdout)['data']['top_predictions'][0]
                ok = pred['pestName'] == cls
            except Exception:
                ok = False
            total += 1
            if ok:
                correct += 1
                cls_correct += 1
        per_class.append((cls, cls_correct, len(samples)))

    acc = correct / max(total, 1)
    print('\n逐类结果:')
    for cls, ok, n in per_class:
        mark = 'PASS' if ok / max(n, 1) >= 0.6 else 'FAIL'
        print(f'  [{mark}] {cls}: {ok}/{n}')

    print(f'\n总体准确率: {acc * 100:.1f}% (目标 ≥{TARGET_ACC * 100:.0f}%)')
    if acc >= TARGET_ACC:
        print('RESULT: PASS')
        return 0
    print('RESULT: FAIL — 需要更多训练数据或调整模型')
    return 1


if __name__ == '__main__':
    sys.exit(main())
