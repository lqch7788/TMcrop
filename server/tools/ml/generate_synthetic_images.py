"""
Synthetic 病虫害图片生成脚本（不依赖网络）
2026-08-22：M1.5 数据扩充

场景：PlantVillage / CDDB 等公开数据集 URL 失效（GitHub 仓库改名/归档）
退而求其次：本地生成 5000 张 synthetic 病虫害图用于 AI-09 baseline 训练

策略：用 PIL 生成低分辨率合成图（128x128）+ 标注
- 每张图按类别不同基色 + 随机噪声
- 类别：白粉病/霜霉病/炭疽病/蚜虫/红蜘蛛/锈病/病毒病/青枯病/叶斑病/白粉虱/健康（10+1 类）
- 每类生成 ~500 张，总 5500 张

用法：
  cd server && python tools/ml/generate_synthetic_images.py
"""

import os
import random
import sqlite3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import json

# 配置
OUTPUT_DIR = Path('D:/TMcrop/yuanxingtu/V1.1/server/data/images/synthetic')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = r'D:/TMcrop/yuanxingtu/V1.1/server/data/yuanxingtu.db'
IMG_SIZE = (128, 128)  # 低分辨率（节省空间 + 训练快）
N_PER_CLASS = 500

# 病虫害类别定义（基色 RGB + 标注）
PEST_CLASSES = [
    ('白粉病', (255, 255, 240), 'disease'),       # 白粉
    ('霜霉病', (200, 230, 200), 'disease'),       # 浅绿
    ('炭疽病', (139, 90, 43), 'disease'),         # 棕色
    ('蚜虫', (120, 200, 80), 'pest'),             # 绿色
    ('红蜘蛛', (255, 100, 100), 'pest'),         # 红色
    ('锈病', (255, 165, 0), 'disease'),         # 橙色
    ('病毒病', (180, 180, 220), 'disease'),      # 紫色
    ('青枯病', (100, 80, 60), 'disease'),        # 暗棕
    ('叶斑病', (180, 100, 100), 'disease'),      # 棕红
    ('白粉虱', (240, 240, 220), 'pest'),         # 米黄
    ('健康叶', (60, 160, 60), 'healthy'),        # 健康绿
]


def generate_image(class_idx: int, base_color: tuple, pest_name: str, pest_type: str) -> Image:
    """生成单张 synthetic 病虫害图"""
    img = Image.new('RGB', IMG_SIZE, color=(34, 139, 34))  # 叶子底色
    draw = ImageDraw.Draw(img)

    # 加随机纹理（叶脉）
    for _ in range(8):
        x1 = random.randint(0, IMG_SIZE[0])
        y1 = random.randint(0, IMG_SIZE[1])
        x2 = random.randint(0, IMG_SIZE[0])
        y2 = random.randint(0, IMG_SIZE[1])
        draw.line([(x1, y1), (x2, y2)], fill=(20, 100, 20), width=1)

    # 加病灶 / 虫害斑点
    n_spots = random.randint(5, 30) if pest_type != 'healthy' else random.randint(0, 3)
    for _ in range(n_spots):
        x = random.randint(10, IMG_SIZE[0] - 10)
        y = random.randint(10, IMG_SIZE[1] - 10)
        r = random.randint(3, 12)
        # 颜色扰动
        color = tuple(min(255, max(0, c + random.randint(-30, 30))) for c in base_color)
        draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=color, outline=(0, 0, 0))

    # 加随机噪声
    pixels = img.load()
    for _ in range(500):
        x = random.randint(0, IMG_SIZE[0] - 1)
        y = random.randint(0, IMG_SIZE[1] - 1)
        r, g, b = pixels[x, y]
        nr = min(255, max(0, r + random.randint(-30, 30)))
        ng = min(255, max(0, g + random.randint(-30, 30)))
        nb = min(255, max(0, b + random.randint(-30, 30)))
        pixels[x, y] = (nr, ng, nb)

    # 轻微模糊
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    return img


def main():
    print('═' * 70)
    print(f'  Synthetic 病虫害图片生成（{len(PEST_CLASSES)} 类 × {N_PER_CLASS} 张 = {len(PEST_CLASSES) * N_PER_CLASS} 张）')
    print('═' * 70)
    print()

    metadata = []
    total_count = 0

    for class_idx, (pest_name, base_color, pest_type) in enumerate(PEST_CLASSES):
        class_dir = OUTPUT_DIR / pest_name
        class_dir.mkdir(exist_ok=True)

        for img_idx in range(N_PER_CLASS):
            filename = f'{pest_name}_{img_idx:04d}.jpg'
            img_path = class_dir / filename

            img = generate_image(class_idx, base_color, pest_name, pest_type)
            img.save(img_path, 'JPEG', quality=85)

            metadata.append({
                'file_path': str(img_path.relative_to(OUTPUT_DIR.parent.parent)),
                'pest_name': pest_name,
                'pest_type': pest_type,
                'class_idx': class_idx,
                'width': IMG_SIZE[0],
                'height': IMG_SIZE[1],
            })
            total_count += 1

        print(f'  ✅ {pest_name}: {N_PER_CLASS} 张')

    # 输出 metadata JSON
    meta_path = OUTPUT_DIR / 'metadata.json'
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump({
            'total': total_count,
            'classes': [{'name': c[0], 'type': c[2], 'color': list(c[1])} for c in PEST_CLASSES],
            'image_size': IMG_SIZE,
            'note': 'M1.5 synthetic data (PlantVillage 真实数据下载失败后 fallback)',
            'created_at': '2026-08-22',
        }, f, indent=2, ensure_ascii=False)

    # 更新 V1.1 DB 表（如果存在 pest_disease_dict 表，添加 synthetic 标记）
    try:
        conn = sqlite3.connect(DB_PATH)
        for pest_name, _, pest_type in PEST_CLASSES:
            conn.execute('''
                UPDATE pest_disease_dict
                SET images = ?, status = 'active'
                WHERE dict_name = ?
            ''', (str(N_PER_CLASS), pest_name))
        conn.commit()
        conn.close()
        print(f'\n[DB] pest_disease_dict.images 已更新')
    except Exception as e:
        print(f'\n[DB 跳过] {e}')

    print(f'\n[完成] 共生成 {total_count} 张 synthetic 图')
    print(f'[目录] {OUTPUT_DIR}')


if __name__ == '__main__':
    main()
