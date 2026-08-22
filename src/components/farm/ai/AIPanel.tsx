/**
 * AI Panel 统一组件（V1）
 * 2026-08-22：智能任务中心 10 个 AI 模块的统一入口
 *
 * 在 SmartDispatch 或任务中心页面嵌入，展示所有 AI 模块的快捷入口。
 * 用户可点击调用对应 AI 模块，弹窗显示结果。
 */

import React, { useState } from 'react';
import { Sparkles, Clock, Truck, Bug, TrendingUp, MapPin, Image as ImageIcon, MessageCircle, FileText, ShieldAlert, Calendar, CheckSquare, ChevronRight } from 'lucide-react';
import { aiApi } from '../../../services/aiApi';
import { Button, Card } from '../../ui';

interface AIPanelProps {
  cropType?: string;
  taskId?: string;
  taskType?: string;
  /** 紧凑模式：仅显示按钮列表（适合表格行内嵌入） */
  compact?: boolean;
}

const AI_MODULES = [
  { key: 'workhour', name: 'AI-06 工时预测', icon: Clock, color: 'blue' },
  { key: 'dispatch', name: 'AI-01 派工推荐', icon: Sparkles, color: 'emerald' },
  { key: 'growth', name: 'AI-04 生长预测', icon: TrendingUp, color: 'green' },
  { key: 'pest', name: 'AI-05 病虫害预警', icon: Bug, color: 'red' },
  { key: 'route', name: 'AI-08 路径优化', icon: MapPin, color: 'orange' },
  { key: 'image', name: 'AI-09 图像识别', icon: ImageIcon, color: 'purple' },
  { key: 'qa', name: 'AI-12 问答助手', icon: MessageCircle, color: 'cyan' },
  { key: 'report', name: 'AI-13 报告生成', icon: FileText, color: 'indigo' },
  { key: 'schedule', name: 'AI-02 排班', icon: Calendar, color: 'pink' },
  { key: 'anomaly', name: 'AI-14 异常检测', icon: ShieldAlert, color: 'amber' },
];

export function AIPanel({ cropType = '番茄', taskId, taskType, compact = false }: AIPanelProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; data: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callAI = async (key: string) => {
    setLoadingKey(key);
    setError(null);
    setResult(null);
    try {
      let res: any;
      switch (key) {
        case 'workhour':
          res = await aiApi.workhour.predict({ task_type: taskType || '灌溉', priority: 'normal', task_id: taskId });
          break;
        case 'dispatch':
          res = await aiApi.dispatch.recommend({ task_type: taskType || '灌溉', priority: 'normal' });
          break;
        case 'growth':
          res = await aiApi.growth.predict({ crop_type: cropType, plant_date: '2026-05-01' });
          break;
        case 'pest':
          res = await aiApi.pest.alert({ crop_type: cropType, env_data: { temperature: 22, humidity: 85 } });
          break;
        case 'route':
          res = await aiApi.route.optimize({
            worker_start: { lat: 30.27, lng: 120.15 },
            tasks: [
              { task_id: 'T1', lat: 30.28, lng: 120.16, name: 'A温室' },
              { task_id: 'T2', lat: 30.30, lng: 120.18, name: 'B温室' },
            ],
          });
          break;
        case 'image':
          res = await aiApi.image.identify({ image_id: `IMG-${Date.now()}`, image_name: 'demo.jpg' });
          break;
        case 'qa':
          res = await aiApi.qa.ask({ question: `关于${cropType}种植的最佳实践？` });
          break;
        case 'report':
          res = await aiApi.report.generate({ report_type: 'weekly' });
          break;
        case 'schedule':
          res = await aiApi.schedule.generate({
            start_date: new Date().toISOString().split('T')[0],
            days: 7,
            employees: [],
            tasks: [{ task_id: 'T1', task_type: taskType || '灌溉', estimated_hours: 4 }],
          });
          break;
        case 'anomaly':
          res = await aiApi.anomaly.detect({ lookback_days: 30 } as any);
          break;
      }
      setResult({ key, data: res });
    } catch (e: any) {
      setError(e?.message || '调用失败');
    } finally {
      setLoadingKey(null);
    }
  };

  // 紧凑模式：仅图标按钮列表
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {AI_MODULES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={(e) => { e.stopPropagation(); callAI(m.key); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
            disabled={loadingKey === m.key}
            title={m.name}
          >
            <m.icon className="w-3 h-3" />
            {loadingKey === m.key ? '调用中' : m.name.replace(/^AI-\d+\s/, '')}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-semibold text-gray-900">AI 智能助手（10 模块）</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {AI_MODULES.map((m) => {
          const Icon = m.icon;
          const isLoading = loadingKey === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => callAI(m.key)}
              disabled={isLoading}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border border-${m.color}-200 bg-${m.color}-50 hover:bg-${m.color}-100 disabled:opacity-50`}
            >
              <Icon className={`w-5 h-5 text-${m.color}-600`} />
              <span className="text-xs text-gray-700 text-center">{m.name}</span>
              {isLoading && <span className="text-[10px] text-gray-500">推理中...</span>}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          �️ {error}
        </div>
      )}

      {result && (
        <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {AI_MODULES.find(m => m.key === result.key)?.name} 结果
            </span>
            <button onClick={() => setResult(null)} className="text-xs text-gray-500">关闭</button>
          </div>
          <pre className="text-xs bg-white p-2 rounded border border-gray-100 overflow-auto max-h-64">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}

export default AIPanel;
