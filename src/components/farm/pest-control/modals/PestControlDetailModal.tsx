/**
 * 病虫害防治记录详情弹窗
 * 只读显示所有字段信息
 */
import React, { useState } from 'react';
import { X, History, Bug } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { useDictionaryStore } from '@/stores';
import { PestControlData } from '@/stores/usePestControlStore';

// 防治类型标签
const CONTROL_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  chemical: { label: '化学防治', color: 'text-red-700', bg: 'bg-red-100' },
  bio: { label: '生物防治', color: 'text-green-700', bg: 'bg-green-100' },
  physical: { label: '物理防治', color: 'text-blue-700', bg: 'bg-blue-100' },
};

// 单位选项
const DOSAGE_UNITS = ['克', '千克', '毫升', '升', '袋', '瓶'];

interface PestControlDetailModalProps {
  isOpen: boolean;
  record: PestControlData | null;
  onClose: () => void;
}

export function PestControlDetailModal({ isOpen, record, onClose }: PestControlDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'detail'>('info');
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  if (!isOpen || !record) return null;

  // 获取字典项标签
  const getDictLabel = (category: string, code: string) => {
    if (!code || !dictionaries.length) return code;
    const items = dictionaries.filter(d => (d as any).categoryCode === category);
    const item = items.find(d => (d as any).dictCode === code);
    return item ? (item as any).dictLabel : code;
  };

  const controlTypeInfo = CONTROL_TYPE_LABELS[record.controlType] || { label: record.controlType, color: 'text-gray-700', bg: 'bg-gray-100' };

  // 格式化日期时间
  const formatDateTime = (datetime: string) => {
    if (!datetime) return '-';
    return datetime.replace('T', ' ');
  };

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="病虫害防治详情" size="xl" showFooter={false}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* 标签页切换 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'info'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            基本信息
          </button>
          <button
            onClick={() => setActiveTab('detail')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1 ${
              activeTab === 'detail'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bug className="w-4 h-4" />
            防治详情
          </button>
        </div>

        {/* 基本信息标签页 */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* 头部信息卡片 */}
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-emerald-600 block font-medium">记录编号</span>
                  <span className="text-lg font-mono font-bold text-emerald-700">{record.recordCode}</span>
                </div>
                <div>
                  <span className="text-xs text-emerald-600 block font-medium">防治类型</span>
                  <span className={`inline-block px-2 py-1 text-sm rounded-full ${controlTypeInfo.bg} ${controlTypeInfo.color}`}>
                    {controlTypeInfo.label}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-emerald-600 block font-medium">防治时间</span>
                  <span className="text-sm font-medium text-gray-900">{formatDateTime(record.sprayTime)}</span>
                </div>
                <div>
                  <span className="text-xs text-emerald-600 block font-medium">叶面肥联用</span>
                  <span className={`inline-block px-2 py-1 text-sm rounded-full ${record.useLeafFertilizer === 'yes' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {record.useLeafFertilizer === 'yes' ? '是' : '否'}
                  </span>
                </div>
              </div>
            </div>

            {/* 详细信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 左列 */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">作物与位置</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">作物名称</span>
                      <span className="text-sm text-gray-900">{record.cropName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">温室位置</span>
                      <span className="text-sm text-gray-900">{record.greenhouseName || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">叶面肥信息</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">叶面肥名称</span>
                      <span className="text-sm text-gray-900">{record.leafFertilizerName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">用量</span>
                      <span className="text-sm text-gray-900">
                        {record.leafFertilizerDosage ? `${record.leafFertilizerDosage} ${record.leafFertilizerUnit || ''}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右列 */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">系统信息</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">创建时间</span>
                      <span className="text-sm text-gray-900">{formatDateTime(record.createTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">更新时间</span>
                      <span className="text-sm text-gray-900">{formatDateTime(record.updateTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">状态</span>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        record.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {record.status === 'active' ? '启用' : record.status}
                      </span>
                    </div>
                  </div>
                </div>

                {record.description && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">备注</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{record.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 防治详情标签页 */}
        {activeTab === 'detail' && (
          <div className="space-y-4">
            {/* 化学防治详情 */}
            {record.controlType === 'chemical' && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  化学防治详情
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-red-600 block">药剂名称</span>
                    <span className="text-sm font-medium text-gray-900">{record.pesticideName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-red-600 block">药剂类型</span>
                    <span className="text-sm font-medium text-gray-900">{getDictLabel('pesticide_type', record.pesticideType || '') || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-red-600 block">用药量</span>
                    <span className="text-sm font-medium text-gray-900">
                      {record.dosage ? `${record.dosage} ${record.dosageUnit || ''}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-red-600 block">稀释比例</span>
                    <span className="text-sm font-medium text-gray-900">{record.dilutionRatio || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-red-600 block">施用方法</span>
                    <span className="text-sm font-medium text-gray-900">{getDictLabel('application_method', record.applicationMethod || '') || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 生物防治详情 */}
            {record.controlType === 'bio' && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  生物防治详情
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-green-600 block">生物制剂名称</span>
                    <span className="text-sm font-medium text-gray-900">{record.bioAgentName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-green-600 block">制剂类型</span>
                    <span className="text-sm font-medium text-gray-900">{getDictLabel('bio_agent_type', record.bioAgentType || '') || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-green-600 block">用量</span>
                    <span className="text-sm font-medium text-gray-900">
                      {record.dosage ? `${record.dosage} ${record.dosageUnit || ''}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-green-600 block">稀释比例</span>
                    <span className="text-sm font-medium text-gray-900">{record.dilutionRatio || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 物理防治详情 */}
            {record.controlType === 'physical' && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  物理防治详情
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-blue-600 block">防治设备/方式</span>
                    <span className="text-sm font-medium text-gray-900">{record.equipmentName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-blue-600 block">用量/次数</span>
                    <span className="text-sm font-medium text-gray-900">{record.equipmentCount || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 叶面肥详情 */}
            {record.useLeafFertilizer === 'yes' && (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  叶面肥联用详情
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-emerald-600 block">叶面肥名称</span>
                    <span className="text-sm font-medium text-gray-900">{record.leafFertilizerName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-emerald-600 block">用量</span>
                    <span className="text-sm font-medium text-gray-900">
                      {record.leafFertilizerDosage ? `${record.leafFertilizerDosage} ${record.leafFertilizerUnit || ''}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-emerald-600 block">单位</span>
                    <span className="text-sm font-medium text-gray-900">{record.leafFertilizerUnit || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>
    </UnifiedModal>
  );
}
