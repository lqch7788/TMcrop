"""
AI 端点性能压测脚本（Phase 5 集成测试）
2026-08-22：批量调 15 个 AI 端点，记录 P50/P95/P99 延迟

用法：
  cd server && python tools/ml/load_test_ai_endpoints.py
"""

import requests
import json
import time
import statistics
from pathlib import Path

BASE_URL = 'http://localhost:3001/api'
N_REQUESTS = 50

ENDPOINTS = [
    ('workhour', '/ai/workhour/predict', {'task_type': '灌溉', 'priority': 'normal'}),
    ('workhour_feedback', '/ai/workhour/feedback', {'task_id': 'NS20260728-001', 'actual_hours': 4.5, 'accepted': True}),
    ('dispatch', '/ai/dispatch/recommend', {'task_type': '灌溉', 'priority': 'normal'}),
    ('growth', '/ai/growth/predict', {'crop_type': '番茄', 'plant_date': '2026-05-01'}),
    ('pest', '/ai/pest/alert', {'crop_type': '番茄', 'env_data': {'temperature': 22, 'humidity': 85}}),
    ('route', '/ai/route/optimize', {'worker_start': {'lat': 30.27, 'lng': 120.15}, 'tasks': [
        {'task_id': 'T1', 'lat': 30.28, 'lng': 120.16, 'name': 'A温室'},
        {'task_id': 'T2', 'lat': 30.30, 'lng': 120.18, 'name': 'B温室'},
    ]}),
    ('image', '/ai/image/identify', {'image_id': 'IMG-TEST-001', 'image_name': 'test.jpg'}),
    ('qa', '/ai/qa/ask', {'question': '怎么添加派工任务'}),
    ('report', '/ai/report/generate', {'report_type': 'weekly'}),
    ('schedule', '/ai/schedule/generate', {'start_date': '2026-08-22', 'days': 7, 'employees': [
        {'employee_id': 'E001', 'name': '张三', 'skills': ['种植', '灌溉']}
    ], 'tasks': [{'task_id': 'T1', 'task_type': '灌溉', 'estimated_hours': 4}]}),
    ('resource', '/ai/resource/optimize', {'lookback_days': 30, 'forecast_days': 14}),
    ('growth_state', '/ai/growth-state/identify', {'crop_type': '番茄', 'current_gdd': 900}),
    ('voice', '/ai/voice/transcribe', {'transcribed_text': '今天上午在2号棚灌溉番茄'}),
    ('anomaly', '/ai/anomaly/detect', {}),
    ('attendance', '/ai/attendance/detect', {}),
    ('approval', '/ai/approval/suggest', {'applicant_id': 'E001', 'approval_type': 'leave', 'duration_days': 5}),
]


def benchmark(name: str, path: str, body: dict, n: int) -> dict:
    """单端点压测"""
    durations: list[float] = []
    errors = 0

    for _ in range(n):
        start = time.time()
        try:
            r = requests.post(f'{BASE_URL}{path}', json=body, timeout=30)
            elapsed = (time.time() - start) * 1000  # ms
            durations.append(elapsed)
            if r.status_code != 200:
                errors += 1
        except Exception:
            errors += 1

    if not durations:
        return {'name': name, 'errors': errors, 'status': 'failed'}

    return {
        'name': name,
        'n': len(durations),
        'errors': errors,
        'min': round(min(durations), 1),
        'p50': round(statistics.median(durations), 1),
        'p95': round(sorted(durations)[int(len(durations) * 0.95)], 1),
        'p99': round(sorted(durations)[int(len(durations) * 0.99)], 1),
        'max': round(max(durations), 1),
        'mean': round(statistics.mean(durations), 1),
    }


def main():
    print('═' * 80)
    print(f'  AI 端点性能压测（{len(ENDPOINTS)} 端点 × {N_REQUESTS} 次/端点 = {len(ENDPOINTS) * N_REQUESTS} 请求）')
    print('═' * 80)
    print()

    results = []
    for name, path, body in ENDPOINTS:
        result = benchmark(name, path, body, N_REQUESTS)
        results.append(result)
        if 'p50' in result:
            status = '✅' if result['errors'] == 0 else '⚠️'
            print(f"  {status} {result['name']:18} p50={result['p50']:6.1f}ms  p95={result['p95']:6.1f}ms  p99={result['p99']:6.1f}ms  errors={result['errors']}")
        else:
            print(f"  ❌ {result['name']:18} 全失败 errors={result['errors']}")

    # 输出报告
    output_path = Path('tools/ml/output/load_test_report.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            'date': '2026-08-22',
            'n_requests_per_endpoint': N_REQUESTS,
            'total_requests': len(ENDPOINTS) * N_REQUESTS,
            'results': results,
        }, f, indent=2, ensure_ascii=False)
    print(f'\n[报告保存] {output_path}')

    # 汇总
    p95_values = [r['p95'] for r in results if 'p95' in r]
    avg_p95 = statistics.mean(p95_values)
    print()
    print(f'  📊 所有端点平均 p95: {avg_p95:.1f}ms')
    print(f'  🎯 PPT 要求：图像识别 <3s (3000ms)，其他无明确延迟要求')
    print(f'  {"✅ 达标" if avg_p95 < 3000 else "⚠️ 超标"}')


if __name__ == '__main__':
    main()
