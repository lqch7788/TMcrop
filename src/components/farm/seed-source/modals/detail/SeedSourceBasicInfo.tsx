/**
 * 种源详情 — 基本信息面板（涵盖种源列表全部列 + 模式感知）
 * 2026-10-18：从 DetailModal.tsx 拆出（纯移动，无逻辑变更）
 */
import { useState } from 'react';
import { Badge } from '@/components/ui';
import { SeedSource } from '../../../../../types/crop';
import { STOCK_STATUS_MAP, UNIT_MAP, SOURCE_ORIGIN_MAP } from '../../../../../constants/cropConstants';
import { resolveSeedFormLabel } from '../../../../../constants/seedFormDict';
import { computeStockStatus } from '../../../../../lib/stockStatus';
import { useSeedSourceVarietyPath } from '@/hooks/useSeedSourceVarietyPath';
import { MODE_CONFIG } from './constants';
import { ImageViewer } from './ImageViewer';

export function SeedSourceBasicInfo({ record }: { record: SeedSource }) {
  const formatUnit = (unit: string) => UNIT_MAP[unit] || unit || '';
  const status = STOCK_STATUS_MAP[computeStockStatus(record.availableCount, record.initialCount)] || STOCK_STATUS_MAP['sufficient'];
  // 2026-07-21：使用共享 hook 取完整 4 段品种路径（与列表完全一致）
  const { getVarietyPath } = useSeedSourceVarietyPath();

  // 2026-10-17：图片列表 + 放大查看器状态（用户报告：编辑弹窗已支持上传图片，详情无法查看）
  // 后端列存 JSON 字符串（Base64 数组），前端类型虽标 string[]，仍需防御式解析（与编辑/种植详情同模式）
  const images: string[] = (() => {
    if (Array.isArray(record.pictures)) return record.pictures;
    if (typeof record.pictures === 'string') {
      try { return JSON.parse(record.pictures); } catch { return []; }
    }
    return [];
  })();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // 判断入库模式
  const originKey = record.sourceOrigin || (record.transferredFromStockId ? 'transfer_from_inventory' : 'external');
  const mode = MODE_CONFIG[originKey] || MODE_CONFIG['external'];
  const isTransfer = originKey === 'inventory_transfer' || originKey === 'transfer_from_inventory' || !!record.transferredFromStockId;

  return (
    <div className="space-y-6">
      {/* 入库模式标签 */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${mode.color}`}>
        {mode.icon}
        {mode.label}
      </div>

      {/* 基本信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">基本信息</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">种源批号：</span>
            <span className="text-sm font-mono text-blue-600">{record.seedCode}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">作物编码：</span>
            <span className="text-sm font-mono text-orange-600">{record.cropCode || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">作物品种：</span>
            <span className="text-sm text-gray-900">{record.cropName}{record.cropVariety ? `（${record.cropVariety}）` : ''}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">品种路径：</span>
            {/* 2026-07-21：使用共享 hook 取完整 4 段路径（与列表完全一致） */}
            <span className="text-sm text-gray-600">{getVarietyPath(record)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">来源途径：</span>
            <span className="text-sm text-gray-900">{SOURCE_ORIGIN_MAP[originKey]?.label || mode.label}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">种源形态：</span>
            <span className="text-sm text-gray-900">{resolveSeedFormLabel(record.seedForm) || '—'}</span>
          </div>
          {/* 2026-10-17：删除「种源类型」显示行（用户决策）——列表 2026-06-30 已将
              「种源类型 + 种源形态」合并为单列（仓库角色不区分繁殖细节），详情单独成行属遗留冗余；
              DB 字段保留（供应商候选过滤 SOURCE_TYPE_TO_SUPPLIER_TYPE 在用） */}
        </div>
      </div>

      {/* 库存信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">库存信息</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">入库日期：</span>
            <span className="text-sm text-gray-900">{record.purchaseDate || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">入库数量：</span>
            <span className="text-sm text-gray-900">{record.quantity.toLocaleString()} {formatUnit(record.unit)}</span>
          </div>
          {/* 2026-07-21：价格字段统一展示（不再仅 external 模式显示）
              - 外购：显示 unitPrice + totalAmount
              - 调拨：unitPrice 已从原库存复制（见 inventoryTransfer.service.ts:489），显示单价+总额 + 原始供应商
              - 回流：unitPrice 默认 0，显示"—"
              调拨种源额外显示"原始单价"作为审计对照
              2026-07-21 修复：加"元"字，为 0 时显示"—" */}
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">单价：</span>
            <span className="text-sm text-gray-900">
              {record.unitPrice ? `¥${record.unitPrice}元/${formatUnit(record.unit)}` : '—'}
              {isTransfer && record.originalUnitPrice != null && Number(record.unitPrice) !== Number(record.originalUnitPrice) && (
                <span className="text-xs text-gray-400 ml-1">（原始 ¥{record.originalUnitPrice}元）</span>
              )}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">总金额：</span>
            <span className="text-sm text-gray-900">{record.totalAmount ? `¥${record.totalAmount.toLocaleString()}元` : '—'}</span>
          </div>
          <div className="flex items-center">
            {/* 2026-10-17：命名统一为「原始供应商」+ 去重复括号 ——
                调拨/回流的 supplierName 只是来源库存供应商的副本，两者同值时展示一次；
                统一取值 originalSupplierName 优先（与列表/导出/编辑口径一致） */}
            <span className="text-sm text-gray-500 w-24">原始供应商：</span>
            <span className="text-sm text-gray-900">{record.originalSupplierName || record.supplierName || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">可用数量：</span>
            <span className="text-sm font-medium text-emerald-600">{record.availableCount.toLocaleString()} {formatUnit(record.unit)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">库存状态：</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
        </div>
      </div>

      {/* 2026-07-21：删除"繁殖信息"区块 — 内部种源已退化为纯仓库角色，育种/留种功能已移到种植管理
         外购/调拨/回流种源均不再显示繁殖相关字段（propagationType/propagationMethod/propagationStatus 为历史遗留） */}

      {/* 其他信息 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">其他信息</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建人：</span>
            <span className="text-sm text-gray-900">{record.createBy || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">创建时间：</span>
            <span className="text-sm text-gray-900">{record.createTime || '—'}</span>
          </div>
          {/* 2026-07-21：补全最后修改人/时间 */}
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">最后修改人：</span>
            <span className="text-sm text-gray-900">{(record as any).updateBy || '—'}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 w-24">最后修改时间：</span>
            <span className="text-sm text-gray-900">{record.updateTime || '—'}</span>
          </div>
          {/* 2026-10-17：删除「打印次数 / 生产计划 / 溯源码」三行显示（用户决策）——
              打印次数：唯一 +1 端点（POST /seed-sources/:id/print）在前端已无调用方，
                实际打印走标签模块（/plant-labels/batch-create）不回写 → 统计断链，显示会误导；
              溯源码：种源模块无写入端，全库 0/19 恒为空（溯源语义已由二维码 + 溯源链承载）；
              生产计划：调拨仅从来源库存复制（本批全空）、留种不写，原计划链路已由溯源链「原始快照」承载。
              DB 字段全部保留（不删列，仅去掉恒空/断链的显示）。 */}
          {/* 2026-07-18: 种源合并 - 回流次数 + 最近回流时间 + 合并历史 */}
          {(record.reflowCount ?? 0) > 0 && (
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">回流次数：</span>
              <span className="text-sm text-cyan-700 font-medium">
                {record.reflowCount} 次
                {record.lastReflowAt && (
                  <span className="text-xs text-gray-500 ml-2">
                    （最近 {record.lastReflowAt}）
                  </span>
                )}
              </span>
            </div>
          )}
          {record.mergedFromIds && record.mergedFromIds.length > 0 && (
            <div className="col-span-2 flex flex-col gap-2">
              <div className="flex items-start">
                <span className="text-sm text-gray-500 w-24 flex-shrink-0">合并历史：</span>
                <Badge variant="secondary" className="text-xs">
                  合并了 {record.mergedFromIds.length} 条历史种源（已归档）
                </Badge>
              </div>
              {/* 2026-08-16：完整显示所有 ID 列表（不再截断 16 字符、不限前 3 条）
                  每条 ID 全行展示 + archived 徽章，方便用户复制完整 ID 去数据库追溯 */}
              <div className="ml-24 border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {record.mergedFromIds.map((id, idx) => (
                    <div key={idx} className="px-3 py-1.5 text-sm flex items-center justify-between hover:bg-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 text-xs w-8 shrink-0">#{idx + 1}</span>
                        <code className="text-xs font-mono text-gray-700 truncate" title={id}>
                          {id}
                        </code>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">已归档</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {record.remarks && (
            <div className="col-span-2 flex items-start">
              <span className="text-sm text-gray-500 w-24 flex-shrink-0">备注：</span>
              <span className="text-sm text-gray-900">{record.remarks}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2026-10-17：图片信息 — 编辑/新建弹窗支持上传图片，详情此前缺少展示（用户报告）。
          与种植详情 DetailModal「图片信息」区块同模式：缩略图网格 + 点击放大查看器 */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">图片信息</h4>
          <div className="grid grid-cols-4 gap-3">
            {images.map((img: string, index: number) => (
              <div
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 border border-gray-200"
              >
                <img src={img} alt={`图片${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图片放大查看器 */}
      {selectedImageIndex !== null && images.length > 0 && (
        <ImageViewer
          images={images}
          selectedIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
          onPrev={() => setSelectedImageIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setSelectedImageIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i))}
        />
      )}
    </div>
  );
}
