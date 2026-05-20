import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
import type { WorkLogFormModalProps, WorkLog } from './types';
import { Label } from '@/components/ui/label';

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

  const content = (
    <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
      <div className="grid grid-cols-2 gap-4">
        {/* 日志编号 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            日志编号
          </Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">日期</Label>
          <DatePicker
            selected={formData.date ? new Date(formData.date) : undefined}
            onChange={(date) => handleChange('date', date.toISOString().split('T')[0])}
            className="w-full"
          />
        </div>

        {/* 工人姓名 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">工人姓名</Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">天气</Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">温度</Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">作物</Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">大棚</Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">生长状况</Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">工作内容</Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">问题描述</Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">处理措施</Label>
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
  );

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>
        取消
      </Button>
      <Button onClick={handleSubmit}>
        保存
      </Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={log ? '编辑日志' : '新建日志'}
      size="md"
      showFooter={true}
      headerAction={
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
