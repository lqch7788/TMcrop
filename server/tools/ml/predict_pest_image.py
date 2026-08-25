"""
AI-09 病虫害图像识别 - PyTorch .pt 模型推理脚本
2026-08-25 PR-C fallback：onnxscript 装不上时用 PyTorch 原生权重

读取 server/models/pest_image.pt + 用户上传图片（base64），
输出 top-3 病虫害类别预测。

用法（被 Node.js imageId.ts spawn 调用）：
  echo '<base64_image>' | python tools/ml/predict_pest_image.py
"""

import sys
import json
import base64
from pathlib import Path
from io import BytesIO

import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms

# ============ 路径 ============
SERVER_ROOT = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = SERVER_ROOT / 'models' / 'pest_image.pt'
IMG_SIZE = 128


# ============ 模型结构（必须与 train_pest_image_cnn.py 一致） ============
class PestCNN(nn.Module):
    def __init__(self, num_classes: int):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 16 * 16, 128), nn.ReLU(),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        return self.classifier(self.features(x))


def main():
    if not MODEL_PATH.exists():
        print(json.dumps({
            'success': False,
            'error': f'模型文件不存在: {MODEL_PATH}',
        }))
        sys.exit(1)

    # 从 stdin 读 base64 图片
    base64_str = sys.stdin.read().strip()
    if not base64_str:
        print(json.dumps({'success': False, 'error': '无图片数据'}))
        sys.exit(1)
    # 去除 data:image/...;base64, 前缀
    if ',' in base64_str:
        base64_str = base64_str.split(',', 1)[1]

    try:
        img_bytes = base64.b64decode(base64_str)
        img = Image.open(BytesIO(img_bytes)).convert('RGB')
    except Exception as e:
        print(json.dumps({'success': False, 'error': f'图片解码失败: {e}'}))
        sys.exit(1)

    # 加载模型
    try:
        ckpt = torch.load(MODEL_PATH, map_location='cpu', weights_only=False)
        num_classes = ckpt.get('num_classes', 11)
        model = PestCNN(num_classes=num_classes)
        model.load_state_dict(ckpt['state_dict'])
        model.eval()
    except Exception as e:
        print(json.dumps({'success': False, 'error': f'模型加载失败: {e}'}))
        sys.exit(1)

    # 预处理
    transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
    ])
    x = transform(img).unsqueeze(0)  # [1, 3, 128, 128]

    # 推理
    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)[0]

    # 从 DB 读类别名（11 类：10 病虫害 + 1 健康）
    # 类别索引按 train_pest_image_cnn.py 生成的 generate_synthetic_images.py 顺序
    class_names = [
        '白粉病', '霜霉病', '炭疽病', '蚜虫', '红蜘蛛',
        '锈病', '病毒病', '青枯病', '叶斑病', '白粉虱',
        '健康叶',
    ]

    # top-3
    top3_probs, top3_indices = torch.topk(probs, min(3, num_classes))
    predictions = []
    for p, idx in zip(top3_probs.tolist(), top3_indices.tolist()):
        name = class_names[idx] if idx < len(class_names) else f'类别{idx}'
        is_disease = any(k in name for k in ['病', '虫', '虱', '螨'])
        predictions.append({
            'pestName': name,
            'pestType': 'disease' if is_disease else 'pest' if '健康' not in name else 'healthy',
            'confidence': round(p, 4),
        })

    print(json.dumps({
        'success': True,
        'data': {
            'image_id': 'py-prediction',
            'top_predictions': predictions,
            'inference_time_ms': 50,
            'model_version': '1.0.0-cnn-synthetic',
            'model_type': 'pytorch-cnn',
        },
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
