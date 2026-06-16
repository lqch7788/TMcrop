/**
 * 育苗详情弹窗
 */

import React, { useState } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Seedling, SeedlingStatus, TransplantRecordStatus } from '../../../../types/crop';
import TraceChain from '../../trace/TraceChain';
import { History } from 'lucide-react';
import { SEEDLING_STATUS_MAP, TRANSPLANT_STATUS_MAP } from '../../../../constants/cropConstants';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

export function DetailModal({
  isOpen,
  onClose,
  record
}: DetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'trace'>('info');

  // TODO: 颜色值与共享常量 SEEDLING_STATUS_MAP 不同，暂保留本地定义
  const statusMap = {
    [SeedlingStatus.IN_PROGRESS]: { label: '进行中', color: 'text-amber-600 bg-amber-50' },
    [SeedlingStatus.TRANSPLANT_READY]: { label: '待定植', color: 'text-blue-600 bg-blue-50' },
    [SeedlingStatus.COMPLETED]: { label: '已完成', color: 'text-green-600 bg-green-50' },
    [SeedlingStatus.ABNORMAL]: { label: '异常', color: 'text-red-600 bg-red-50' }
  };

  const status = statusMap[record.status] || statusMap[SeedlingStatus.IN_PROGRESS];

  // TODO: "库存" 与共享常量 TRANSPLANT_STATUS_MAP 的 "库存中" 字面不同，暂保留本地定义
  const getTransplantStatusLabel = (s?: TransplantRecordStatus) => {
    if (!s) return '-';
    switch (s) {
      case TransplantRecordStatus.IN_STOCK: return '库存';
      case TransplantRecordStatus.TRANSPLANTING: return '定植中';
      case TransplantRecordStatus.GROWING: return '生长期';
      case TransplantRecordStatus.HARVESTED: return '已采收';
      default: return s;
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="育苗详情"
      size="xl"
      showFooter={true}
      onSubmit={() => onClose()}
      submitText="关闭"
      cancelText=""
    >
      {/* 标签页切换 */}
      <div className="flex border-b border-gray-200 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('info')}
          className={`border-b-2 -mb-px rounded-none flex items-center gap-1 ${
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
          onClick={() => setActiveTab('trace')}
          className={`border-b-2 -mb-px rounded-none flex items-center gap-1 ${
            activeTab === 'trace'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          追溯链路
        </Button>
      </div>

      {/* 标签页内容 */}
      {activeTab === 'info' ? (
      <div className="space-y-6">
        {/* 基本信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">基本信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">育苗批号：</span>
              <span className="text-sm font-mono text-blue-600">{record.seedlingCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">作物品种：</span>
              <span className="text-sm text-gray-900">{record.cropName}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">品种路径：</span>
              <span className="text-sm text-gray-900">{record.cropVariety}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">关联种源：</span>
              <span className="text-sm text-gray-900">{record.sourceCode}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">育苗方式：</span>
              <span className="text-sm text-gray-900">{record.seedlingType}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">温室场地：</span>
              <span className="text-sm text-gray-900">{record.siteName}</span>
            </div>
            {/* 新增字段：所属组织 */}
            {record.orgName && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">所属组织：</span>
                <span className="text-sm text-gray-900">{record.orgName}</span>
              </div>
            )}
            {/* 新增字段：育苗工时 */}
            {record.seedlingTaskTime !== undefined && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">育苗工时：</span>
                <span className="text-sm text-gray-900">{record.seedlingTaskTime} 小时</span>
              </div>
            )}
          </div>
        </div>

        {/* 数量信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">数量信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">开始日期：</span>
              <span className="text-sm text-gray-900">{record.startDate}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">结束日期：</span>
              <span className="text-sm text-gray-900">{record.endDate || '-'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">预计结束：</span>
              <span className="text-sm text-gray-900">{record.expectedEndDate || '-'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">初始数量：</span>
              <span className="text-sm text-gray-900">{record.initialCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">成活数量：</span>
              <span className="text-sm text-emerald-600 font-medium">{record.survivalCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">成苗率：</span>
              <span className="text-sm text-emerald-600 font-bold">{record.survivalRate}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">育苗结束：</span>
              <span className="text-sm text-gray-900">{record.isFinished ? '是' : '否'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">状态：</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            {record.qualityGrade && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">品质等级：</span>
                <span className="text-sm text-gray-900">{record.qualityGrade}</span>
              </div>
            )}
          </div>

          {/* 2026-06-16: 数量体系重构 — 6 业务字段展示（与 EditModal 数量统计区一致，与 DB 字段一一对应） */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h5 className="text-sm font-semibold text-amber-900 mb-2">数量统计（自动累加，对应 DB 字段）</h5>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-32" title="1:多模式母株死亡累计，DB: mother_loss_count">母株累计损耗：</span>
                <span className="text-sm text-red-500 font-medium">{((record as any).motherLossCount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-32" title="1:1=成活累计；1:多=小苗累计产出，DB: expanded_plant_count">小苗累计产出：</span>
                <span className="text-sm text-emerald-600 font-medium">{((record as any).expandedPlantCount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-32" title="小苗死亡/淘汰累计，DB: seedling_loss_count">小苗累计损耗：</span>
                <span className="text-sm text-red-500 font-medium">{((record as any).seedlingLossCount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-32" title="人工把小苗定植到种植区累计，DB: transplanted_count">人工定植累计：</span>
                <span className="text-sm text-blue-600 font-medium">{((record as any).transplantedCount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-32" title="种植管理自动累加，DB: auto_planted_count">自动定植累计：</span>
                <span className="text-sm text-blue-600 font-medium">{((record as any).autoPlantedCount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-32" title="采收入库累计，DB: harvest_stocked_count">采收入库累计：</span>
                <span className="text-sm text-purple-600 font-medium">{((record as any).harvestStockedCount || 0).toLocaleString()}</span>
              </div>
              {/* 2026-06-16: 补苗累计（严格区分母株/小苗池子） */}
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-32" title="1:1=补种子；1:多=补母株；DB: replant_count">补苗累计：</span>
                <span className="text-sm text-emerald-600 font-medium">{((record as any).replantCount || 0).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              累计已定植 = 人工定植累计 + 自动定植累计 = {(((record as any).transplantedCount || 0) + ((record as any).autoPlantedCount || 0)).toLocaleString()} 株
              ｜ 累计损耗 = 母株累计损耗 + 小苗累计损耗 = {(((record as any).motherLossCount || 0) + ((record as any).seedlingLossCount || 0)).toLocaleString()} 株
            </p>
          </div>
        </div>

        {/* 栽种记录（新增） */}
        {record.transplantRecords && record.transplantRecords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
              栽种记录 ({record.transplantRecords.length} 条)
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {record.transplantRecords.map((tr, index) => (
                <div key={tr.id || index} className="bg-gray-50 rounded p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{tr.transplantDate}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      tr.status === TransplantRecordStatus.GROWING ? 'bg-green-100 text-green-700' :
                      tr.status === TransplantRecordStatus.HARVESTED ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {getTransplantStatusLabel(tr.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-600 grid grid-cols-2 gap-1 text-xs">
                    <span>场地: {tr.areaName}</span>
                    {tr.zoneName && <span>区域: {tr.zoneName}</span>}
                    {tr.bedName && <span>苗床: {tr.bedName}</span>}
                    <span>定植数量: {tr.transplantCount}</span>
                    <span>剩余: {tr.remainingCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 其他信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">其他信息</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">创建人：</span>
              <span className="text-sm text-gray-900">{record.createBy}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">创建时间：</span>
              <span className="text-sm text-gray-900">{record.createTime}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">更新时间：</span>
              <span className="text-sm text-gray-900">{record.updateTime}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">打印次数：</span>
              <span className="text-sm text-gray-900">{record.printCount} 次</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">每日记录：</span>
              <span className="text-sm text-gray-900">{record.dailyRecords.length} 条</span>
            </div>
            {/* 新增：打印记录数量 */}
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">打印记录：</span>
              <span className="text-sm text-gray-900">
                {record.printRecords ? `${record.printRecords.length} 条` : '0 条'}
              </span>
            </div>
            {record.remarks && (
              <div className="col-span-2 flex items-start">
                <span className="text-sm text-gray-500 w-24 flex-shrink-0">备注：</span>
                <span className="text-sm text-gray-900">{record.remarks}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
      /* 追溯链路标签页 */
      <div className="py-2">
        {record.instanceId ? (
          <TraceChain
            type="seedling"
            businessId={record.instanceId}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无库存实例</p>
            <p className="text-xs mt-1">该育苗尚未接入库存服务</p>
          </div>
        )}
      </div>
      )}
    </UnifiedModal>
  );
}
