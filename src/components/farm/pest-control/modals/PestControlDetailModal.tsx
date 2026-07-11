/**
 * 病虫害防治记录详情弹窗
 * 2026-07-10：完全重构，删除化学/生物/物理 3 段分支表，改为统一字段展示
 * - 头部「防治类型 Badge」改为「药剂类型 chips」（多值）
 * - 防治详情表统一用 pesticideList / bioAgentList / equipmentList 合并显示
 */
import React, { useState } from 'react';
import { Bug, X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { useDictionaryStore, getDictLabel } from '@/stores';
import { PestControlData } from '@/stores/usePestControlStore';

interface PestControlDetailModalProps {
  isOpen: boolean;
  record: PestControlData | null;
  onClose: () => void;
}

export function PestControlDetailModal({ isOpen, record, onClose }: PestControlDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'detail'>('info');
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  if (!isOpen || !record) return null;

  // 解析 JSON 列表
  const parseJsonArray = (jsonStr: string | null | undefined): any[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const leafFertilizerList = parseJsonArray(record.leafFertilizerName);
  const pesticideList = parseJsonArray((record as any).pesticideList);
  const bioAgentList = parseJsonArray((record as any).bioAgentList);
  const equipmentList = parseJsonArray((record as any).equipmentList);
  const targetPestList = (() => {
    if (!record.targetPest) return [];
    try {
      const parsed = JSON.parse(record.targetPest);
      return Array.isArray(parsed) ? parsed : [record.targetPest];
    } catch {
      return [record.targetPest];
    }
  })();

  // 2026-07-10：合并所有防治项目（pesticideList + bioAgentList + equipmentList + 单值字段）→ 统一显示
  const unifiedItems: any[] = [];
  if (pesticideList.length > 0) {
    pesticideList.forEach((it: any) => unifiedItems.push({
      name: it.name,
      pesticideTypes: Array.isArray(it.types) ? it.types : (it.type ? [it.type] : []),
      dosage: it.dosage,
      unit: it.unit,
      ratio: it.ratio,
      applicationMethod: it.applicationMethod,
    }));
  } else if (record.pesticideName) {
    unifiedItems.push({
      name: record.pesticideName,
      pesticideTypes: record.pesticideTypes || (record.pesticideType ? [record.pesticideType] : []),
      dosage: record.dosage,
      unit: record.dosageUnit,
      ratio: record.dilutionRatio,
      applicationMethod: record.applicationMethod,
    });
  }
  // 兼容 bio/physical 字段
  if (bioAgentList.length > 0) {
    bioAgentList.forEach((it: any) => unifiedItems.push({
      name: it.name,
      pesticideTypes: [],
      dosage: it.dosage,
      unit: it.unit,
      ratio: it.ratio,
    }));
  } else if (record.bioAgentName) {
    unifiedItems.push({
      name: record.bioAgentName,
      pesticideTypes: [],
      dosage: record.dosage,
      unit: record.dosageUnit,
      ratio: record.dilutionRatio,
    });
  }
  if (equipmentList.length > 0) {
    equipmentList.forEach((it: any) => unifiedItems.push({
      name: it.name,
      pesticideTypes: [],
      dosage: it.count,
      unit: '',
      ratio: '',
    }));
  } else if (record.equipmentName) {
    unifiedItems.push({
      name: record.equipmentName,
      pesticideTypes: [],
      dosage: record.equipmentCount,
      unit: '',
      ratio: '',
    });
  }

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
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-emerald-600 block font-medium">记录编号</span>
                  <span className="text-lg font-mono font-bold text-emerald-700">{record.recordCode}</span>
                </div>
                <div>
                  <span className="text-xs text-emerald-600 block font-medium mb-1">药剂类型</span>
                  <div className="flex flex-wrap gap-1">
                    {(record.pesticideTypes || []).map(t => (
                      <span key={t} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                        {getDictLabel('pesticide_type', t) || t}
                      </span>
                    ))}
                    {(!record.pesticideTypes || record.pesticideTypes.length === 0) && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">操作员</span>
                      <span className="text-sm text-gray-900">{record.operatorName || '-'}</span>
                    </div>
                  </div>
                </div>

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
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{record.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 防治详情标签页 */}
        {activeTab === 'detail' && (
          <div className="space-y-4">
            {/* 总览表 */}
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 w-24">施用方法</td>
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

            {/* 2026-07-10：统一防治项目表（不分化学/生物/物理） */}
            <div className="overflow-hidden border border-emerald-200 rounded-lg">
              <div className="bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">防治项目</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-emerald-50/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-emerald-700">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-emerald-700">名称</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-emerald-700">药剂类型</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700">用量</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700">稀释倍数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {unifiedItems.length > 0 ? (
                    unifiedItems.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-emerald-50/30">
                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{it.name || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-0.5">
                            {(it.pesticideTypes || []).map((t: string) => (
                              <span key={t} className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {getDictLabel('pesticide_type', t) || t}
                              </span>
                            ))}
                            {(!it.pesticideTypes || it.pesticideTypes.length === 0) && (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">{it.dosage || '-'} {it.unit || ''}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{it.ratio || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-gray-400">暂无防治项目</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 叶面肥列表（保留） */}
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

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>
    </UnifiedModal>
  );
}