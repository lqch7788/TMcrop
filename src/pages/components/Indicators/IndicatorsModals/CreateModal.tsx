/**
 * 指标创建/编辑弹窗组件
 * 用于新增指标或编辑已有指标
 */
import { Plus, Edit } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { Indicator } from '../../../types/indicators.types';
import { CATEGORIES } from '../../../hooks/useIndicators';

interface CreateModalProps {
  isOpen: boolean;
  indicator: Indicator | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CreateModal({ isOpen, indicator, onClose, onSave }: CreateModalProps) {
  const isEdit = !!indicator;
  const categories = CATEGORIES.filter(c => c !== '全部');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            {isEdit ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {isEdit ? '编辑指标' : '新增指标'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white">
            &times;
          </Button>
        </div>

        {/* 表单内容 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                指标编码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                defaultValue={indicator?.code || 'KPI017'}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                指标名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                defaultValue={indicator?.name || ''}
                placeholder="请输入指标名称"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                <select
                  defaultValue={indicator?.category || '生产指标'}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">数据采集方式</label>
                <select
                  defaultValue={indicator?.source || '自动采集'}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="自动采集">自动采集</option>
                  <option value="人工录入">人工录入</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="blue" onClick={onSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
