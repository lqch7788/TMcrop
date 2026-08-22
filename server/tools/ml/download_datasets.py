"""
公开数据集下载脚本（M1.5 数据准备）
2026-08-22：等网络通畅时执行

用法：
  cd server && python tools/ml/download_datasets.py --dataset plantvillage
"""

import os
import sys
import argparse
import urllib.request
import zipfile
from pathlib import Path

# 数据集清单（按推荐顺序）
DATASETS = {
    'plantvillage': {
        'name': 'PlantVillage',
        'size': '~1.6 GB',
        'count': '54,305 张',
        'classes': '38 病害 + 12 健康',
        'url': 'https://data.mendeley.com/datasets/tywbtsjrjy/3/files/75377c4f-d6cf-44f5-a3b8-6e9b9c08faba/PlantVillage.zip',
        'license': 'CC-BY 4.0',
        'priority': 1,
    },
    'ai_challenger': {
        'name': 'AI Challenger 农业病害',
        'size': '~500 MB',
        'count': '27,000 张（10 类）',
        'classes': '苹果/葡萄/柑橘/玉米/番茄/辣椒/桃/草莓/南瓜/樱桃',
        'url': 'https://aistudio.baidu.com/datasetdetail/13537',
        'license': '学术研究',
        'priority': 2,
        'note': '需要百度账号下载',
    },
    'cddb_china': {
        'name': 'CDDB 中国果蔬病害',
        'size': '~200 MB',
        'count': '5,000+ 张',
        'classes': '中国本地作物',
        'url': 'https://github.com/xinyu1205/Recognize-Plant-Diseases',
        'license': 'MIT',
        'priority': 3,
    },
    'inaturalist': {
        'name': 'iNaturalist Research Grade',
        'size': 'API 按需拉取',
        'count': '100,000+ 自然场景',
        'classes': '病害 + 健康',
        'url': 'https://api.inaturalist.org/v1/observations?quality_grade=research&taxon_id=47126&per_page=200',
        'license': 'CC-BY-NC',
        'priority': 4,
        'note': 'API 方式拉取，非一次性下载',
    },
}


def download_dataset(name: str, output_dir: str):
    """下载指定数据集"""
    if name not in DATASETS:
        print(f'❌ 未知数据集: {name}')
        print(f'可用: {", ".join(DATASETS.keys())}')
        return False

    ds = DATASETS[name]
    print(f'═' * 60)
    print(f'下载: {ds["name"]} ({ds["size"]}, {ds["count"]})')
    print(f'  URL: {ds["url"]}')
    print(f'  License: {ds["license"]}')
    print(f'  Priority: {ds["priority"]}')
    print(f'═' * 60)

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    output_path = Path(output_dir) / f'{name}.zip'

    if output_path.exists():
        print(f'�️ 已存在: {output_path}')
        return True

    print(f'⏳ 下载中 → {output_path}')
    print(f'   (网络受限时此步骤会失败，请等代理恢复后重试)')

    try:
        urllib.request.urlretrieve(ds['url'], output_path)
        size_mb = output_path.stat().st_size / 1024 / 1024
        print(f'✅ 下载完成: {size_mb:.1f} MB')
        return True
    except Exception as e:
        print(f'❌ 下载失败: {e}')
        print(f'   建议：手动从 URL 下载后放到 {output_path}')
        return False


def main():
    parser = argparse.ArgumentParser(description='M1.5 数据集下载')
    parser.add_argument('--dataset', choices=list(DATASETS.keys()) + ['all'],
                       help='指定数据集（默认 all）')
    parser.add_argument('--output', default='data/images/',
                       help='输出目录（默认 data/images/）')
    parser.add_argument('--list', action='store_true',
                       help='只列出数据集清单，不下载')
    args = parser.parse_args()

    if args.list or args.dataset is None:
        print('可用数据集:')
        for key, ds in sorted(DATASETS.items(), key=lambda x: x[1]['priority']):
            print(f'  [{ds["priority"]}] {key}: {ds["name"]}')
            print(f'      数量: {ds["count"]}, 大小: {ds["size"]}, 类别: {ds["classes"]}')
            print(f'      URL: {ds["url"]}')
        return

    datasets = list(DATASETS.keys()) if args.dataset == 'all' else [args.dataset]
    for name in datasets:
        download_dataset(name, args.output)


if __name__ == '__main__':
    main()
