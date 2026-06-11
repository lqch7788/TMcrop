/**
 * 回流记录弹窗 (Phase 4: 前端 UI 接入)
 *
 * 展示种源的回流记录 (作为父种源或子种源的 circulation_records)
 * 风格遵循 V1.1 现有约定: UnifiedModal + UI 库组件 + lucide-react 图标 + deepInputClass
 */
import React, { useState, useEffect } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Recycle } from 'lucide-react';
import { enhancedApiClient } from '../../../../lib/apiClient';

interface CirculationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  seedSourceId: string;
  seedCode: string;
}

interface CirculationRecord {
  id: string;
  circulation_type: string;
  source_module: string;
  source_id: string;
  parent_source_id: string;
  new_source_id: string | null;
  quantity: number | null;
  unit: string | null;
  circulation_date: string;
  residue_type: string | null;
  disposition: string | null;
  notes: string | null;
  is_revoked: number;
  revoked_at: string | null;
  created_at: string;
}

const CIRCULATION_TYPE_LABELS: Record<string, string> = {
  PROPAGATION: '代际型（建新种源）',
  QUANTITY: '数量型（回填数量）',
  DISPOSAL: '废弃',
};

const CIRCULATION_COLORS: Record<string, string> = {
  PROPAGATION: 'text-purple-600 bg-purple-50',
  QUANTITY: 'text-blue-600 bg-blue-50',
  DISPOSAL: 'text-red-600 bg-red-50',
};

export function CirculationHistoryModal({ isOpen, onClose, seedSourceId, seedCode }: CirculationHistoryModalProps) {
  const [records, setRecords] = useState<CirculationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && seedSourceId) {
      setLoading(true);
      enhancedApiClient.get(`/seed-sources/circulation?parentSourceId=${seedSourceId}`)
        .then((res: { data?: CirculationRecord[] } | CirculationRecord[]) => {
          // enhancedApiClient 已自动解包 data, res 可能是 ApiResponse 或直接数组
          // 上游可能返回 {success, data} 或直接返回数组
          setRecords(Array.isArray(res) ? res : (res?.data || []));
        })
        .catch(() => {
          // 回流记录查询失败 — 无法展示历史, 静默降级为空列表
          setRecords([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, seedSourceId]);

  return (
    <UnifiedModal
      open={isOpen}
      onClose={onClose}
      title={`回流记录 — ${seedCode}`}
      width="lg"
      showFooter={true}
      submitText="关闭"
      onSubmit={onClose}
      cancelText=""
    >
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-gray-500 text-sm">加载中...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Recycle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">暂无回流记录</p>
            <p className="text-xs mt-1 text-gray-300">该种源尚未发生过回流操作</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">回流类型</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">来源模块</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">数量</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">日期</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${CIRCULATION_COLORS[r.circulation_type] || 'text-gray-600 bg-gray-50'}`}>
                        {CIRCULATION_TYPE_LABELS[r.circulation_type] || r.circulation_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.source_module === 'planting' ? '种植' : r.source_module === 'harvest' ? '采收' : r.source_module}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {r.quantity != null ? `${r.quantity} ${r.unit || ''}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.circulation_date?.slice(0, 10) || r.created_at?.slice(0, 10) || '-'}</td>
                    <td className="px-3 py-2">
                      {r.is_revoked ? (
                        <span className="text-amber-600 text-xs">已撤销</span>
                      ) : (
                        <span className="text-green-600 text-xs">有效</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400">
          回流记录展示该种源作为父种源被种植回流的历史。
          如需新建回流操作，请在种植管理中使用「种植结束」功能。
        </p>
      </div>
    </UnifiedModal>
  );
}
