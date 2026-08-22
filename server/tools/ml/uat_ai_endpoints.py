"""
AI 端点 UAT 集成测试（Phase 5）
2026-08-22：覆盖 15 个 AI 端点的 happy path + 错误处理

用法：
  cd server && python tools/ml/uat_ai_endpoints.py
"""

import requests
import json
import time
from pathlib import Path
from datetime import datetime

BASE_URL = 'http://localhost:3001/api'

# 测试用例：(name, endpoint, payload, expect_status, validator)
TEST_CASES = [
    # ============ Happy Path ============
    ('AI-01 happy', '/ai/dispatch/recommend', {'task_type': '灌溉', 'priority': 'normal'}, 200, lambda d: 'recommendations' in d and len(d['recommendations']) > 0),
    ('AI-02 happy', '/ai/schedule/generate', {'start_date': '2026-08-22', 'days': 3, 'employees': [], 'tasks': [{'task_id': 'T1', 'task_type': '灌溉', 'estimated_hours': 4}]}, 200, lambda d: 'daily_schedule' in d),
    ('AI-04 happy', '/ai/growth/predict', {'crop_type': '番茄', 'plant_date': '2026-05-01'}, 200, lambda d: d['currentStage'] in ['萌发', '苗期', '开花', '结果', '成熟', '成熟（采收期）']),
    ('AI-05 happy', '/ai/pest/alert', {'crop_type': '番茄', 'env_data': {'temperature': 22, 'humidity': 85}}, 200, lambda d: d['overallRisk'] in ['low', 'medium', 'high', 'critical']),
    ('AI-06 happy', '/ai/workhour/predict', {'task_type': '灌溉', 'priority': 'normal'}, 200, lambda d: 0 < d['predictedHours'] < 100),
    ('AI-07 happy', '/ai/resource/optimize', {'lookback_days': 30}, 200, lambda d: 'alerts' in d and 'summary' in d),
    ('AI-08 happy', '/ai/route/optimize', {'worker_start': {'lat': 30.27, 'lng': 120.15}, 'tasks': [{'task_id': 'T1', 'lat': 30.28, 'lng': 120.16}]}, 200, lambda d: 'optimizedOrder' in d),
    ('AI-09 happy', '/ai/image/identify', {'image_id': 'IMG-001'}, 200, lambda d: len(d['topPredictions']) >= 1),
    ('AI-10 happy', '/ai/growth-state/identify', {'crop_type': '番茄', 'current_gdd': 500}, 200, lambda d: d['healthStatus'] in ['excellent', 'good', 'fair', 'poor', 'critical']),
    ('AI-11 happy', '/ai/voice/transcribe', {'transcribed_text': '今天上午灌溉番茄3小时'}, 200, lambda d: 'intent' in d and d['intent'] in ['work_log', 'task_feedback', 'issue_report', 'knowledge_query', 'unknown']),
    ('AI-12 happy', '/ai/qa/ask', {'question': '什么是派工'}, 200, lambda d: 'intent' in d and 'answer' in d),
    ('AI-13 happy', '/ai/report/generate', {'report_type': 'weekly'}, 200, lambda d: 'sections' in d and len(d['sections']) >= 3),
    ('AI-14 happy', '/ai/anomaly/detect', {}, 200, lambda d: 'anomalies' in d),
    ('AI-15 happy', '/ai/attendance/detect', {}, 200, lambda d: 'anomalies' in d and 'summary' in d),
    ('AI-03 happy', '/ai/approval/suggest', {'applicant_id': 'E001', 'approval_type': 'leave', 'duration_days': 3}, 200, lambda d: d['decision'] in ['approve', 'reject', 'review']),

    # ============ Error Handling ============
    ('AI-01 missing task_type', '/ai/dispatch/recommend', {}, 400, lambda d: '必填' in d.get('error', '')),
    ('AI-04 missing crop_type', '/ai/growth/predict', {}, 400, lambda d: '必填' in d.get('error', '')),
    ('AI-05 missing crop_type', '/ai/pest/alert', {}, 400, lambda d: '必填' in d.get('error', '')),
    ('AI-06 missing task_type', '/ai/workhour/predict', {}, 400, lambda d: '必填' in d.get('error', '')),
    ('AI-11 missing text', '/ai/voice/transcribe', {}, 400, lambda d: '必填' in d.get('error', '')),
    ('AI-03 missing fields', '/ai/approval/suggest', {}, 400, lambda d: '必填' in d.get('error', '')),
    ('AI-13 missing type', '/ai/report/generate', {}, 400, lambda d: '必填' in d.get('error', '')),

    # ============ XAI Coverage ============
    ('AI-01 XAI', '/ai/dispatch/recommend', {'task_type': '灌溉'}, 200, lambda d: any('xai_reasons' in r for r in d.get('recommendations', []))),
    ('AI-06 XAI', '/ai/workhour/predict', {'task_type': '灌溉'}, 200, lambda d: len(d.get('xaiReasons', [])) >= 1),
    ('AI-13 XAI', '/ai/report/generate', {'report_type': 'weekly'}, 200, lambda d: all('insights' in s for s in d.get('sections', []))),
]


def main():
    print('═' * 80)
    print(f'  AI 端点 UAT 集成测试（{len(TEST_CASES)} 用例）')
    print('═' * 80)
    print()

    passed = 0
    failed = 0
    results = []

    for name, endpoint, payload, expect_status, validator in TEST_CASES:
        try:
            r = requests.post(f'{BASE_URL}{endpoint}', json=payload, timeout=30)
            if r.status_code == expect_status:
                body = r.json()
                # success=true 时检查 data 字段
                if r.status_code == 200 and body.get('success') is False:
                    failed += 1
                    print(f'  ❌ {name}: HTTP {r.status_code} 但 success=false - {body.get("error", "?")[:60]}')
                    results.append({'name': name, 'status': 'FAIL', 'reason': body.get('error', '')})
                    continue
                # validator 校验
                check_data = body.get('data', body) if r.status_code == 200 else body
                if validator(check_data):
                    passed += 1
                    print(f'  ✅ {name}: HTTP {r.status_code}')
                    results.append({'name': name, 'status': 'PASS'})
                else:
                    failed += 1
                    print(f'  ❌ {name}: HTTP {r.status_code} 但 validator 失败')
                    results.append({'name': name, 'status': 'FAIL', 'reason': 'validator 失败'})
            else:
                failed += 1
                print(f'  ❌ {name}: HTTP {r.status_code}（期望 {expect_status}）')
                results.append({'name': name, 'status': 'FAIL', 'reason': f'HTTP {r.status_code}'})
        except Exception as e:
            failed += 1
            print(f'  ❌ {name}: 异常 - {str(e)[:60]}')
            results.append({'name': name, 'status': 'ERROR', 'reason': str(e)[:100]})

    # 汇总
    total = passed + failed
    pass_rate = round(passed / total * 100, 1) if total > 0 else 0

    print()
    print('═' * 80)
    print(f'  UAT 测试汇总：通过 {passed}/{total} ({pass_rate}%)')
    print('═' * 80)

    # 输出报告
    output_path = Path('tools/ml/output/uat_report.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            'date': datetime.now().isoformat(),
            'total': total,
            'passed': passed,
            'failed': failed,
            'pass_rate_percent': pass_rate,
            'results': results,
        }, f, indent=2, ensure_ascii=False)
    print(f'  [报告保存] {output_path}')

    return failed


if __name__ == '__main__':
    import sys
    sys.exit(0 if main() == 0 else 1)
