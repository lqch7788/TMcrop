// 供应商详情弹窗组件
import { useEffect, useState } from 'react';
import { Supplier, SUPPLIER_INTERNAL_OPTIONS } from './types';
import { getSupplierTypeName } from './data';
import { evaluateSupplierQualification, QUALIFICATION_STATUS_TEXT, QUALIFICATION_STATUS_CLASS } from './qualification';
import { UnifiedModal } from '@/components/ui';
import { enhancedApiClient } from '@/lib/apiClient';

/** 供应商经营统计单项（后端 /suppliers/:id/stats 返回） */
interface SupplierStatsEntry {
  label: string;
  count: number;
  amount: number;
  lastDate: string;
}

interface SupplierStats {
  purchasePlan: SupplierStatsEntry;
  materialCost: SupplierStatsEntry;
  inventoryInbound: SupplierStatsEntry;
  seedSource: SupplierStatsEntry;
  materialInbound: SupplierStatsEntry;
  totalAmount: number;
  lastTransactionDate: string;
}

interface SupplierDetailModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
}

export default function SupplierDetailModal({ isOpen, supplier, onClose }: SupplierDetailModalProps) {
  // 2026-09-28 批次C：经营统计按需拉取（一次性查询动作，不必进 Store）
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    if (!isOpen || !supplier) {
      setStats(null);
      setStatsError('');
      return;
    }
    let cancelled = false;
    setStats(null);
    setStatsError('');
    enhancedApiClient
      .get<SupplierStats>(`/suppliers/${supplier.id}/stats`)
      .then((r) => { if (!cancelled) setStats((r as unknown as SupplierStats) || null); })
      .catch((e) => { if (!cancelled) setStatsError(e instanceof Error ? e.message : '统计加载失败'); });
    return () => { cancelled = true; };
  }, [isOpen, supplier]);

  if (!isOpen || !supplier) return null;

  // 2026-09-28 批次B：资质合规评估（详情页展示证号/有效期/状态）
  const qualification = evaluateSupplierQualification(supplier);
  const isInternalLabel = SUPPLIER_INTERNAL_OPTIONS.find(
    (o) => o.value === (supplier.isInternal || 'external')
  )?.label || '外部采购';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="供应商详情"
      size="lg"
    >
      <div className="grid grid-cols-2 gap-6">
        {/* 基本信息 */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">基本信息</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">供应商编号</span>
                <span className="text-sm font-medium text-gray-900">{supplier.code}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">供应商名称</span>
                <span className="text-sm font-medium text-gray-900">{supplier.name}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">供应类型</span>
                <span className="text-sm text-gray-700">{getSupplierTypeName(supplier.supplierType)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">供应商属性</span>
                <span className="text-sm text-gray-700">{supplier.supplierAttribute}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">所属组织</span>
                <span className="text-sm text-gray-700">{supplier.organization}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">状态</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  supplier.status === '合作中' ? 'bg-green-100 text-green-700' :
                  supplier.status === '暂停' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {supplier.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">联系方式</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">联系人</span>
                <span className="text-sm text-gray-900">{supplier.contact}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">移动电话</span>
                <span className="text-sm text-gray-900">{supplier.mobilePhone}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">工作电话</span>
                <span className="text-sm text-gray-700">{supplier.workPhone || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">传真</span>
                <span className="text-sm text-gray-700">{supplier.fax || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 地址信息 */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">地址信息</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-xs text-gray-500 block">国家/地区</span>
              <span className="text-sm text-gray-900">{supplier.country}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">省份</span>
                <span className="text-sm text-gray-900">{supplier.province}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">城市</span>
                <span className="text-sm text-gray-900">{supplier.city}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">详细地址</span>
              <span className="text-sm text-gray-900">{supplier.address}</span>
            </div>
          </div>
        </div>

        {/* 银行信息 */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">银行信息</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">开户行</span>
                <span className="text-sm text-gray-900">{supplier.bankName || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">银行卡号</span>
                <span className="text-sm text-gray-900">{supplier.bankCardNumber || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2026-09-28 批次B 合规风控：资质证照 */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">资质证照</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {qualification.status === 'not_required' ? (
              <p className="text-sm text-gray-500">
                当前供应类型（{getSupplierTypeName(supplier.supplierType)}）不强制持证
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{qualification.label}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${QUALIFICATION_STATUS_CLASS[qualification.status]}`}>
                    {QUALIFICATION_STATUS_TEXT[qualification.status]}
                  </span>
                  {(qualification.status === 'expiring' || qualification.status === 'expired') && qualification.daysLeft !== null && (
                    <span className={`text-xs ${qualification.status === 'expired' ? 'text-red-600' : 'text-yellow-700'}`}>
                      {qualification.status === 'expired'
                        ? `逾期 ${Math.abs(qualification.daysLeft)} 天`
                        : `剩余 ${qualification.daysLeft} 天`}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">证号</span>
                    <span className="text-sm text-gray-900">{qualification.no || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">有效期至</span>
                    <span className="text-sm text-gray-900">{qualification.expiry || '-'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2026-09-28 批次C 经营决策 */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">经营决策</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">内部自产标记</span>
                <span className="text-sm text-gray-900">{isInternalLabel}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">结算方式</span>
                <span className="text-sm text-gray-900">{supplier.settlementType || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">账期天数</span>
                <span className="text-sm text-gray-900">{supplier.creditDays ? `${supplier.creditDays} 天` : '-'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">评级</span>
                <span className="text-sm text-gray-900">{supplier.rating ? `${supplier.rating} / 5` : '未评级'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2026-09-28 批次C：经营统计（按 supplier_id 聚合各业务表） */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">经营统计</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            {statsError ? (
              <p className="text-sm text-red-600">统计加载失败：{statsError}</p>
            ) : !stats ? (
              <p className="text-sm text-gray-400">加载中…</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-200">
                      <th className="text-left py-1 font-medium">业务</th>
                      <th className="text-right py-1 font-medium">单据数</th>
                      <th className="text-right py-1 font-medium">金额合计</th>
                      <th className="text-right py-1 font-medium">最近日期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[stats.purchasePlan, stats.materialCost, stats.inventoryInbound, stats.seedSource, stats.materialInbound]
                      .filter(Boolean)
                      .map((row) => (
                        <tr key={row.label}>
                          <td className="py-1.5 text-gray-700">{row.label}</td>
                          <td className="py-1.5 text-right text-gray-900">{row.count}</td>
                          <td className="py-1.5 text-right text-gray-900">
                            {row.amount ? `¥${row.amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-1.5 text-right text-gray-500">{row.lastDate || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 text-sm">
                  <span className="text-gray-600">累计金额</span>
                  <span className="font-medium text-gray-900">¥{stats.totalAmount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  仅统计已登记主数据 id（supplier_id）的单据；最近交易日期
                  {stats.lastTransactionDate ? `：${stats.lastTransactionDate}` : '：无'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* 其他信息 */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-500 mb-3">其他信息</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-xs text-gray-500 block">创建时间</span>
              <span className="text-sm text-gray-900">{supplier.createDate}</span>
            </div>
            {supplier.remarks && (
              <div>
                <span className="text-xs text-gray-500 block">备注</span>
                <span className="text-sm text-gray-700">{supplier.remarks}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
