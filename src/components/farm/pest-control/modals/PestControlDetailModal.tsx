/**
 * 病虫害防治记录详情弹窗
 * 只读显示所有字段信息
 */
import React, { useState } from 'react';
import { Bug, X } from 'lucide-react';
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

  // 解析 JSON 列表字段（多药剂/多制剂/多叶面肥/多设备存为 JSON 字符串）
  const parseJsonArray = (jsonStr: string | null | undefined): any[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // 叶面肥列表（支持新旧格式：JSON 数组 / 单字符串）
  const leafFertilizerList = parseJsonArray(record.leafFertilizerName);
  // 药剂列表
  const pesticideList = parseJsonArray((record as any).pesticideList);
  // 生物制剂列表
  const bioAgentList = parseJsonArray((record as any).bioAgentList);
  // 设备列表
  const equipmentList = parseJsonArray((record as any).equipmentList);
  // 目标病虫害列表
  const parseTargetPests = (str: string | null | undefined): string[] => {
    if (!str) return [];
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [str];
    } catch {
      return [str];
    }
  };
  const targetPestList = parseTargetPests(record.targetPest);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('info')}
            className={`rounded-none px-4 py-2 text-sm font-medium border-b-2 -mb-px h-auto ${
              activeTab === 'info'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            基本信息
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('detail')}
            className={`rounded-none px-4 py-2 text-sm font-medium border-b-2 -mb-px h-auto flex items-center gap-1 ${
              activeTab === 'detail'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bug className="w-4 h-4" />
            防治详情
          </Button>
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
                  <span className="text-xs text-emerald-600 block font-medium">肥料联用</span>
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

                {/* 叶面肥信息（表格形式，支持多叶面肥） */}
                {record.useLeafFertilizer === 'yes' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">叶面肥信息</h4>
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-white">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">名称</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">用量</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">稀释倍数</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {leafFertilizerList.length > 0 ? (
                            leafFertilizerList.map((item: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                <td className="px-3 py-2 text-right text-gray-900">{item.dosage || '-'} {item.unit || ''}</td>
                                <td className="px-3 py-2 text-right text-gray-900">{item.ratio || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-3 py-2 text-gray-500">1</td>
                              <td className="px-3 py-2 font-medium text-gray-900">{record.leafFertilizerName || '-'}</td>
                              <td className="px-3 py-2 text-right text-gray-900">{record.leafFertilizerDosage ? `${record.leafFertilizerDosage} ${record.leafFertilizerUnit || ''}` : '-'}</td>
                              <td className="px-3 py-2 text-right text-gray-900">-</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
            {/* 防治信息总览表 */}
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 w-24">防治类型</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${controlTypeInfo.bg} ${controlTypeInfo.color}`}>
                        {controlTypeInfo.label}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-xs text-gray-500">施用方法</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{getDictLabel('application_method', record.applicationMethod || '') || '-'}</td>
                  </tr>
                  {targetPestList.length > 0 && (
                    <tr>
                      <td className="px-4 py-2.5 text-xs text-gray-500">目标病虫害</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {targetPestList.map((pest: string, idx: number) => (
                            <span key={idx} className="inline-flex px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 border border-orange-200">{pest}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 化学防治 — 药剂列表（表格形式） */}
            {record.controlType === 'chemical' && (
              <div className="overflow-hidden border border-red-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-red-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-red-700">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-red-700">药剂名称</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-red-700">药剂类型</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-red-700">用药量</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-red-700">稀释倍数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {pesticideList.length > 0 ? (
                      pesticideList.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-red-50/50">
                          <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{getDictLabel('pesticide_type', item.type || '') || item.type || '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{item.dosage || '-'} {item.unit || ''}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{item.ratio || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-2 text-gray-500">1</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{record.pesticideName || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{getDictLabel('pesticide_type', record.pesticideType || '') || '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{record.dosage ? `${record.dosage} ${record.dosageUnit || ''}` : '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{record.dilutionRatio || '-'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 生物防治 — 制剂列表（表格形式） */}
            {record.controlType === 'bio' && (
              <div className="overflow-hidden border border-green-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-green-700">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-green-700">制剂名称</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-green-700">制剂类型</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-green-700">用量</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-green-700">稀释倍数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-100">
                    {bioAgentList.length > 0 ? (
                      bioAgentList.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-green-50/50">
                          <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{getDictLabel('bio_agent_type', item.type || '') || item.type || '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{item.dosage || '-'} {item.unit || ''}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{item.ratio || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-2 text-gray-500">1</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{record.bioAgentName || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{getDictLabel('bio_agent_type', record.bioAgentType || '') || '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{record.dosage ? `${record.dosage} ${record.dosageUnit || ''}` : '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{record.dilutionRatio || '-'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 物理防治 — 设备列表（表格形式） */}
            {record.controlType === 'physical' && (
              <div className="overflow-hidden border border-blue-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-700">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-700">设备/方式</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-700">用量/次数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {equipmentList.length > 0 ? (
                      equipmentList.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-blue-50/50">
                          <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                          <td className="px-3 py-2 text-gray-900">{item.count || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-2 text-gray-500">1</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{record.equipmentName || '-'}</td>
                        <td className="px-3 py-2 text-gray-900">{record.equipmentCount || '-'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 叶面肥 — 列表（表格形式） */}
            {record.useLeafFertilizer === 'yes' && (
              <div className="overflow-hidden border border-emerald-200 rounded-lg">
                <div className="bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">肥料联用</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-50/50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-emerald-700">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-emerald-700">叶面肥名称</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700">用量</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700">稀释倍数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {leafFertilizerList.length > 0 ? (
                      leafFertilizerList.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-emerald-50/50">
                          <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{item.dosage || '-'} {item.unit || ''}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{item.ratio || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-2 text-gray-500">1</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{record.leafFertilizerName || '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{record.leafFertilizerDosage ? `${record.leafFertilizerDosage} ${record.leafFertilizerUnit || ''}` : '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>
    </UnifiedModal>
  );
}
