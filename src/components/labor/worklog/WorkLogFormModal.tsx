import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { WorkLogFormModalProps, WorkLog } from './types';

/**
 * 工作日志表单弹窗组件（新建/编辑）
 */
export function WorkLogFormModal({ log, open, onClose, onSave }: WorkLogFormModalProps) {
  const [formData, setFormData] = useState<Partial<WorkLog>>({
    code: '',
    date: '',
    worker: '',
    weather: '',
    temperature: '',
    crop: '',
    greenhouse: '',
    growthStatus: '良好',
    tasks: '',
    problems: '',
    solutions: '',
  });

  // 当弹窗打开或 log 变化时，初始化表单数据
  useEffect(() => {
    if (open) {
      if (log) {
        setFormData(log);
      } else {
        // 新建时设置默认值
        setFormData({
          code: `WL${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          worker: '',
          weather: '晴',
          temperature: '',
          crop: '',
          greenhouse: '',
          growthStatus: '良好',
          tasks: '',
          problems: '',
          solutions: '',
        });
      }
    }
  }, [open, log]);

  if (!open) return null;

  const handleChange = (field: keyof WorkLog, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {log ? '编辑日志' : '新建日志'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid grid-cols-2 gap-4">
            {/* 日志编号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日志编号
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => handleChange('code', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                placeholder="自动生成"
              />
            </div>

            {/* 日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
              <input
                type="date"
                value={formData.date || ''}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 工人姓名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工人姓名</label>
              <input
                type="text"
                value={formData.worker || ''}
                onChange={(e) => handleChange('worker', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                placeholder="请输入姓名"
              />
            </div>

            {/* 天气 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">天气</label>
              <select
                value={formData.weather || ''}
                onChange={(e) => handleChange('weather', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择</option>
                <option value="晴">晴</option>
                <option value="多云">多云</option>
                <option value="阴">阴</option>
                <option value="雨">雨</option>
              </select>
            </div>

            {/* 温度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">温度</label>
              <input
                type="text"
                value={formData.temperature || ''}
                onChange={(e) => handleChange('temperature', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                placeholder="如：25°C"
              />
            </div>

            {/* 作物 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作物</label>
              <input
                type="text"
                value={formData.crop || ''}
                onChange={(e) => handleChange('crop', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                placeholder="请输入作物名称"
              />
            </div>

            {/* 大棚 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">大棚</label>
              <select
                value={formData.greenhouse || ''}
                onChange={(e) => handleChange('greenhouse', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择</option>
                <option value="1号棚">1号棚</option>
                <option value="2号棚">2号棚</option>
                <option value="3号棚">3号棚</option>
                <option value="4号棚">4号棚</option>
              </select>
            </div>

            {/* 生长状况 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生长状况</label>
              <select
                value={formData.growthStatus || '良好'}
                onChange={(e) => handleChange('growthStatus', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="良好">良好</option>
                <option value="一般">一般</option>
              </select>
            </div>

            {/* 工作内容 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">工作内容</label>
              <textarea
                value={formData.tasks || ''}
                onChange={(e) => handleChange('tasks', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                placeholder="请输入工作内容"
              />
            </div>

            {/* 问题描述 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">问题描述</label>
              <textarea
                value={formData.problems || ''}
                onChange={(e) => handleChange('problems', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                placeholder="请输入问题描述"
              />
            </div>

            {/* 处理措施 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">处理措施</label>
              <textarea
                value={formData.solutions || ''}
                onChange={(e) => handleChange('solutions', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                placeholder="请输入处理措施"
              />
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
