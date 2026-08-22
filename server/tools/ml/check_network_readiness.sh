#!/bin/bash
# M1.5 网络准备度检查（2026-08-22）
# 检测：网络通畅 + 公开数据集可下载 + PyPI 可装

echo "═══════════════════════════════════════════════"
echo "  M1.5 网络准备度检查"
echo "═══════════════════════════════════════════════"
echo ""

# 1. GitHub 可达性
echo "[1] GitHub HTTPS (443/22):"
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://github.com 2>/dev/null | grep -q "200\|301"; then
    echo "  ✅ HTTPS 可达"
    HTTPS_OK=1
else
    echo "  ❌ HTTPS 不可达"
    HTTPS_OK=0
fi

if nc -z -w 3 github.com 22 2>/dev/null; then
    echo "  ✅ SSH (22) 可达"
    SSH_OK=1
else
    echo "  ⚠️  SSH (22) 不可达"
    SSH_OK=0
fi
echo ""

# 2. PyPI 可达性
echo "[2] PyPI (Python 包管理):"
PYPI_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://pypi.org 2>/dev/null)
if [ "$PYPI_HTTP" = "200" ]; then
    echo "  ✅ PyPI 官方源可达"
else
    PYPI_TS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://pypi.tuna.tsinghua.edu.cn 2>/dev/null)
    if [ "$PYPI_TS" = "200" ]; then
        echo "  ✅ 清华源可达"
    else
        echo "  � PyPI + 清华源都不可达"
    fi
fi
echo ""

# 3. 公开数据集 URL 可达性
echo "[3] 公开数据集 URL:"
for url in \
    "https://data.mendeley.com/datasets/tywbtsjrjy/3/files/75377c4f-d6cf-44f5-a3b8-6e9b9c08faba/PlantVillage.zip" \
    "https://github.com/xinyu1205/Recognize-Plant-Diseases"
do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 -L "$url" 2>/dev/null)
    if [ "$STATUS" = "200" ]; then
        echo "  ✅ $(echo "$url" | head -c 60)..."
    else
        echo "  ❌ $(echo "$url" | head -c 60)... (HTTP $STATUS)"
    fi
done
echo ""

# 4. 综合结论
echo "[结论]"
if [ "$HTTPS_OK" = "1" ]; then
    echo "  ✅ 网络基本通畅，可以执行 M1.5 数据下载脚本"
    echo "  → 运行: cd server && python tools/ml/download_datasets.py"
else
    echo "  ❌ 网络不通，等待代理恢复或网络通畅后再执行"
fi
echo ""
echo "═══════════════════════════════════════════════"
