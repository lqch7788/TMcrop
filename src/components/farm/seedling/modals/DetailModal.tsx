/**
 * 育苗详情弹窗（2026-06-27 重构）
 * 使用通用 EntityDetailModal 包装，Tab：基本信息 / 追溯时间线
 *
 * 2026-06-27：追溯时间线新增"种苗类型"列（数据源 seedling_form）
 */

import React from 'react';
import { EntityDetailModal } from '@/components/ui/EntityDetailModal';
import { Seedling, SeedlingStatus, TransplantRecordStatus } from '../../../../types/crop';
import { SEEDLING_FORM_MAP, SEEDLING_TYPE_MAP, QUALITY_GRADE_MAP } from '../../../../constants/cropConstants';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

/** 基本信息面板 */
function SeedlingBasicInfo({ record }: { record: Seedling }) {
  const statusMap = {
    [SeedlingStatus.IN_PROGRESS]: { label: '进行中', color: 'text-amber-600 bg-amber-50' },
    [SeedlingStatus.TRANSPLANT_READY]: { label: '待定植', color: 'text-blue-600 bg-blue-50' },
    [SeedlingStatus.COMPLETED]: { label: '已完成', color: 'text-green-600 bg-green-50' },
    [SeedlingStatus.ABNORMAL]: { label: '异常', color: 'text-red-600 bg-red-50' },
  };
  const status = statusMap[record.status] || statusMap[SeedlingStatus.IN_PROGRESS];

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
            {/* 2026-07-16 修复：seedlingType 是育苗方式（plug/direct/cutting/grafting 等），
                走 SEEDLING_TYPE_MAP（12 项育苗方式字典）翻译；未匹配则原样回显 */}
            <span className="text-sm text-gray-900">{SEEDLING_TYPE_MAP[record.seedlingType] || record.seedlingType}</span>
          </div>
          {/* 2026-07-21 修复：添加种苗形态（与育苗方式分开显示） */}
          {record.seedlingForm && (
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">种苗形态：</span>
              <span className="text-sm text-gray-900">{SEEDLING_FORM_MAP[record.seedlingForm] || record.seedlingForm}</span>
            </div>
          )}
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">温室场地：</span>
            <span className="text-sm text-gray-900">{record.siteName}</span>
          </div>
          {record.orgName && (
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">所属组织：</span>
              <span className="text-sm text-gray-900">{record.orgName}</span>
            </div>
          )}
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
            <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
          {record.qualityGrade && (
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">品质等级：</span>
              {/* 2026-07-16 修复：qualityGrade 是英文枚举（A/B/special/excellent/good/qualified 等），
                  走 QUALITY_GRADE_MAP 翻译 */}
              <span className="text-sm text-gray-900">{QUALITY_GRADE_MAP[record.qualityGrade]?.label || record.qualityGrade}</span>
            </div>
          )}
        </div>

        {/* 数量统计区 */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h5 className="text-sm font-semibold text-amber-900 mb-2">数量统计（自动累加，对应 DB 字段）</h5>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-32">母株累计损耗：</span>
              <span className="text-sm text-red-500 font-medium">{(record.motherLossCount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-32">小苗累计产出：</span>
              <span className="text-sm text-emerald-600 font-medium">{(record.expandedPlantCount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-32">小苗累计损耗：</span>
              <span className="text-sm text-red-500 font-medium">{(record.seedlingLossCount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-32">采收入库累计：</span>
              <span className="text-sm text-purple-600 font-medium">{(record.harvestStockedCount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-32">补苗累计：</span>
              <span className="text-sm text-emerald-600 font-medium">{(record.replantCount || 0).toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            累计损耗 = 母株累计损耗 + 小苗累计损耗 = {((record.motherLossCount || 0) + (record.seedlingLossCount || 0)).toLocaleString()} 株
          </p>
        </div>
      </div>

      {/* 栽种记录 */}
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
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">打印记录：</span>
            <span className="text-sm text-gray-900">
              {record.printRecords ? `${record.printRecords.length} 条` : '0 条'}
            </span>
          </div>
          {/* 2026-07-21 修复：补全缺失字段 */}
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">作物编码：</span>
            <span className="text-sm font-mono text-orange-600">{record.cropCode || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">单位：</span>
            <span className="text-sm text-gray-900">{record.unit || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">育苗工时：</span>
            <span className="text-sm text-gray-900">{record.seedlingTaskTime ? `${record.seedlingTaskTime} 小时` : '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建人：</span>
            <span className="text-sm text-gray-900">{record.createBy || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建时间：</span>
            <span className="text-sm text-gray-900">{record.createTime || '—'}</span>
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
  );
}

export function DetailModal({ isOpen, onClose, record }: DetailModalProps) {
  return (
    <EntityDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="育苗详情"
      basicInfoPanel={<SeedlingBasicInfo record={record} />}
      entity="seedlings"
      entityId={record.id}
      entityCode={record.seedlingCode}
      // 2026-06-27：种苗形态（花朵/枝条/裸根苗/穴盘苗 等）
      typeColumn={{
        label: '种苗类型',
        // 2026-07-16 修复：
        //   1) 优先 seedlingForm（容器/形态）→ SEEDLING_FORM_MAP
        //   2) fallback 到 seedlingType（育苗方式）→ SEEDLING_TYPE_MAP
        //   解决截图问题：YM20260705 系列 seedlingType='direct' 原本显示 'direct' 英文，现翻译成「直播育苗」
        value: (() => {
          const sf = (record as any).seedlingForm;
          if (sf && SEEDLING_FORM_MAP[sf]) return SEEDLING_FORM_MAP[sf];
          const st = record.seedlingType;
          if (st && SEEDLING_TYPE_MAP[st]) return SEEDLING_TYPE_MAP[st];
          if (sf) return SEEDLING_FORM_MAP[sf] || sf;
          if (st) return st;
          return '-';
        })(),
      }}
    />
  );
}
