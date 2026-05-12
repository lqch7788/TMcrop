import React, { useState } from 'react';
import { X, Clock, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ShiftConfig, ShiftType } from './types';

interface ShiftEditorProps {
  shiftConfigs: ShiftConfig[];
  onUpdateConfig: (name: ShiftType, config: Partial<ShiftConfig>) => void;
  onClose: () => void;
}

const SHIFT_COLORS = [
  { name: 'bg-amber-500', label: '琥珀色' },
  { name: 'bg-blue-500', label: '蓝色' },
  { name: 'bg-indigo-600', label: '深蓝' },
  { name: 'bg-green-500', label: '绿色' },
  { name: 'bg-purple-500', label: '紫色' },
  { name: 'bg-pink-500', label: '粉色' },
  { name: 'bg-red-500', label: '红色' },
  { name: 'bg-teal-500', label: '青色' },
];

export function ShiftEditor({ shiftConfigs, onUpdateConfig, onClose }: ShiftEditorProps) {
  const [editingShift, setEditingShift] = useState<ShiftType | null>(null);
  const [tempConfig, setTempConfig] = useState<Partial<ShiftConfig>>({});

  // 开始编辑
  const handleStartEdit = (shift: ShiftType) => {
    const config = shiftConfigs.find(c => c.name === shift);
    if (config) {
      setEditingShift(shift);
      setTempConfig({ ...config });
    }
  };

  // 保存编辑
  const handleSave = () => {
    if (editingShift && tempConfig.startTime && tempConfig.endTime) {
      onUpdateConfig(editingShift, tempConfig);
      setEditingShift(null);
      setTempConfig({});
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditingShift(null);
    setTempConfig({});
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-800">班次设置</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-gray-500" />
        </Button>
      </div>

      {/* 班次列表 */}
      <div className="space-y-4">
        {shiftConfigs.map(config => (
          <div
            key={config.name}
            className={`
              p-4 rounded-lg border-2 transition-all
              ${editingShift === config.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            {editingShift === config.name ? (
              // 编辑模式
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${config.color}`} />
                    <span className="font-medium text-gray-800">{config.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                    >
                      取消
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSave}
                    >
                      保存
                    </Button>
                  </div>
                </div>

                {/* 时间设置 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      开始时间
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={tempConfig.startTime || ''}
                        onChange={e => setTempConfig(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      结束时间
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={tempConfig.endTime || ''}
                        onChange={e => setTempConfig(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 颜色设置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    颜色
                  </label>
                  <div className="flex gap-2">
                    {SHIFT_COLORS.map(color => (
                      <Button
                        key={color.name}
                        variant="outline"
                        size="icon"
                        onClick={() => setTempConfig(prev => ({ ...prev, color: color.name }))}
                        className={`
                          w-8 h-8 rounded-full p-0
                          ${tempConfig.color === color.name ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
                        `}
                        style={{ backgroundColor: color.name.replace('bg-', '') }}
                      >
                        {tempConfig.color === color.name && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // 显示模式
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded ${config.color}`} />
                  <div>
                    <div className="font-medium text-gray-800">{config.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {config.startTime} - {config.endTime}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartEdit(config.name)}
                  className="text-blue-600 hover:bg-blue-50"
                >
                  编辑
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 提示 */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">
          提示：班次设置将影响所有排班记录的颜色和时间显示。修改班次时间不会影响已执行的签到记录。
        </p>
      </div>
    </div>
  );
}

export default ShiftEditor;
