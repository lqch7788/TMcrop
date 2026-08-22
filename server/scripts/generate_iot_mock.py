"""
IoT mock 数据生成脚本（不依赖真实硬件）
2026-08-22：M1.5 数据扩充

场景：V1.1 无 IoT 传感器（iot_sensors=0），AI-05 病虫害预警无环境数据
降级方案：生成 mock IoT 传感器读数，写入 iot_sensor_readings 表
- 21 温室 × 4 传感器（温度/湿度/土壤/CO2）× 90 天 = 7560 条数据
- 真实物理规律模拟（温度昼夜变化、湿度与温度反相关）

用法：
  cd server && python scripts/generate_iot_mock.py
"""

import sqlite3
import random
import math
from datetime import datetime, timedelta

DB_PATH = r'D:/TMcrop/yuanxingtu/V1.1/server/data/yuanxingtu.db'
N_DAYS = 90
SAMPLE_PER_DAY = 6  # 每 4 小时一次
N_GREENHOUSES = 21

SENSOR_TYPES = [
    ('temperature', '℃', lambda h: 18 + 10 * math.sin((h - 6) / 24 * 2 * math.pi) + random.uniform(-1, 1)),
    ('humidity', '%', lambda h: 70 - 30 * math.sin((h - 6) / 24 * 2 * math.pi) + random.uniform(-5, 5)),
    ('soil_moisture', '%', lambda h: 60 + random.uniform(-3, 3)),
    ('co2', 'ppm', lambda h: 400 + 200 * math.sin((h - 6) / 24 * 2 * math.pi) + random.uniform(-20, 20)),
]


def main():
    print('═' * 60)
    print(f'  IoT mock 数据生成（{N_GREENHOUSES} 温室 × {len(SENSOR_TYPES)} 传感器 × {N_DAYS} 天 × {SAMPLE_PER_DAY} 次/天）')
    print('═' * 60)
    print()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 检查表是否存在（如不存在则跳过 schema 创建，提示手动建表）
    try:
        cur.execute('SELECT COUNT(*) FROM iot_sensor_readings LIMIT 1')
    except Exception:
        print('❌ iot_sensor_readings 表不存在，请先执行迁移：')
        print('  cd server && npx tsx scripts/run-migration-2026-08-22.ts')
        conn.close()
        return

    # 清掉旧 mock 数据（带 iot_sensors.device_id IS NULL 或设备类型 mock）
    cur.execute('DELETE FROM iot_sensor_readings WHERE greenhouse_id IS NULL OR greenhouse_id = ""')
    conn.commit()

    # 获取现有温室
    cur.execute('SELECT id, name FROM greenhouses LIMIT 21')
    greenhouses = cur.fetchall()
    if not greenhouses:
        print('❌ greenhouses 表为空')
        conn.close()
        return
    print(f'[温室] {len(greenhouses)} 个')

    total_inserted = 0
    now = datetime.now()
    start_date = now - timedelta(days=N_DAYS)

    for gh in greenhouses:
        gh_id, gh_name = gh
        for sensor_type, unit, gen_func in SENSOR_TYPES:
            for day in range(N_DAYS):
                for sample in range(SAMPLE_PER_DAY):
                    hour = (sample * 4) % 24
                    value = gen_func(hour)
                    recorded_at = start_date + timedelta(days=day, hours=hour)

                    cur.execute('''
                        INSERT INTO iot_sensor_readings
                            (device_id, sensor_type, value, unit, recorded_at,
                             greenhouse_id, received_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        f'MOCK-{gh_id}-{sensor_type}',
                        sensor_type,
                        round(value, 2),
                        unit,
                        recorded_at.isoformat(),
                        gh_id,
                        recorded_at.isoformat(),
                    ))
                    total_inserted += 1

    conn.commit()
    conn.close()
    print(f'\n[完成] 插入 {total_inserted} 条 IoT mock 数据')
    print(f'[表] iot_sensor_readings（{N_GREENHOUSES} 温室 × 4 传感器 × 90 天 × {SAMPLE_PER_DAY} 次/天）')


if __name__ == '__main__':
    main()
