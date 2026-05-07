#!/bin/bash
# 4级备份脚本：即时 / 小时 / 日 / 周
# 用法: ./backup.sh [db_path] [backup_dir]

DB_PATH="${1:-data/yuanxingtu.db}"
BACKUP_DIR="${2:-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)
WEEK=$(date +%Y%U)

mkdir -p "$BACKUP_DIR"

# 1. 即时备份（每次运行都生成）
mkdir -p "$BACKUP_DIR/instant"
cp "$DB_PATH" "$BACKUP_DIR/instant/yuanxingtu_${TIMESTAMP}.db"
find "$BACKUP_DIR/instant" -name "*.db" -type f | sort | head -n -10 | xargs -r rm -f

# 2. 小时备份（整点触发，保留最近24小时）
MINUTE=$(date +%M)
if [ "$MINUTE" -lt 5 ]; then
  mkdir -p "$BACKUP_DIR/hourly"
  cp "$DB_PATH" "$BACKUP_DIR/hourly/yuanxingtu_${TIMESTAMP}.db"
  find "$BACKUP_DIR/hourly" -name "*.db" -type f -mmin +1440 | xargs -r rm -f
fi

# 3. 日备份（每天一次）
mkdir -p "$BACKUP_DIR/daily"
DAILY_FILE="$BACKUP_DIR/daily/yuanxingtu_${DATE}.db"
if [ ! -f "$DAILY_FILE" ]; then
  cp "$DB_PATH" "$DAILY_FILE"
  find "$BACKUP_DIR/daily" -name "*.db" -type f | sort | head -n -30 | xargs -r rm -f
fi

# 4. 周备份（每周一次）
mkdir -p "$BACKUP_DIR/weekly"
WEEKLY_FILE="$BACKUP_DIR/weekly/yuanxingtu_week${WEEK}.db"
if [ ! -f "$WEEKLY_FILE" ]; then
  cp "$DB_PATH" "$WEEKLY_FILE"
  find "$BACKUP_DIR/weekly" -name "*.db" -type f | sort | head | xargs -r rm -f
fi

echo "备份完成: $(date)"
echo "数据库: $DB_PATH"
echo "备份目录: $BACKUP_DIR"
