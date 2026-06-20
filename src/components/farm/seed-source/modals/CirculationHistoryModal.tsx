/**
 * 回流记录弹窗 (Phase 4: 前端 UI 接入)
 *
 * 展示种源的回流记录 (作为父种源或子种源的 circulation_records)
 * 风格遵循 V1.1 现有约定: UnifiedModal + UI 库组件 + lucide-react 图标 + deepInputClass
 */
import React, { useState, useEffect } from 'react';
import { UnifiedModal, Button } from '@/components/ui';
import { Recycle, Download } from 'lucide-react';
import { enhancedApiClient } from '../../../../lib/apiClient';
import * as XLSX from 'xlsx';

interface CirculationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  seedSourceId: string;
  seedCode: string;
}

interface CirculationRecord {
  id: string;
  circulationType: string;
  sourceModule: string;
  sourceId: string;
  parentSourceId: string;
  newSourceId: string | null;
  quantity: number | null;
  unit: string | null;
  circulationDate: string;
  residueType: string | null;
  disposition: string | null;
  notes: string | null;
  isRevoked: number;
  revokedAt: string | null;
  revokedBy: string | null;
  createdAt: string;
  // 2026-06-19: 后端补的来源批号字段（方便追溯）
  sourceCode?: string;
  parentSourceCode?: string;
  newSourceCode?: string;
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
      // 2026-06-19: 双向上下溯源 — 同时查 parent_source_id 和 new_source_id
      enhancedApiClient.get(`/seed-sources/circulation?seedSourceId=${seedSourceId}`)
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

  // 2026-06-19: 导出 Excel（按表格列映射中文表头）
  const handleExport = () => {
    if (records.length === 0) return;
    const sourceModuleLabel = (m?: string) =>
      m === 'planting' ? '种植' : m === 'harvest' ? '采收' : m === 'seed_source' ? '种源' : m || '';
    const directionLabel = (r: CirculationRecord) =>
      r.parentSourceId === seedSourceId ? '↓ 派生' :
      r.newSourceId === seedSourceId ? '↑ 来源' : '-';
    const rows = records.map((r, i) => ({
      '序号': i + 1,
      '方向': directionLabel(r),
      '回流类型': CIRCULATION_TYPE_LABELS[r.circulationType] || r.circulationType,
      '来源模块': sourceModuleLabel(r.sourceModule),
      '来源单号': r.sourceCode || r.sourceId || '',
      '数量': r.quantity ?? '',
      '单位': r.unit || '',
      '日期': (r.circulationDate || '').slice(0, 10),
      '父种源批号': r.parentSourceCode || r.parentSourceId || '',
      '子种源批号': r.newSourceCode || r.newSourceId || '',
      '状态': r.isRevoked ? '已撤销' : '有效',
      '备注': r.notes || '',
      '记录ID': r.id,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '回流记录');
    // 列宽
    ws['!cols'] = [
      { wch: 6 },  // 序号
      { wch: 10 }, // 方向
      { wch: 18 }, // 回流类型
      { wch: 10 }, // 来源模块
      { wch: 22 }, // 来源单号
      { wch: 8 },  // 数量
      { wch: 8 },  // 单位
      { wch: 12 }, // 日期
      { wch: 22 }, // 父种源批号
      { wch: 22 }, // 子种源批号
      { wch: 8 },  // 状态
      { wch: 20 }, // 备注
      { wch: 36 }, // 记录ID
    ];
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `回流记录_${seedCode}_${today}.xlsx`);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`回流记录 — ${seedCode}`}
      size="lg"
      showFooter={true}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="blue"
            size="sm"
            onClick={handleExport}
            disabled={records.length === 0 || loading}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            导出 Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            关闭
          </Button>
        </div>
      }
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
                  <th className="px-3 py-2 text-left text-xs text-gray-500">方向</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">回流类型</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">来源模块</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">来源单号</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">数量</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">日期</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {r.parentSourceId === seedSourceId ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium text-cyan-700 bg-cyan-50" title="作为父种源派生了下游">↓ 派生</span>
                      ) : r.newSourceId === seedSourceId ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium text-purple-700 bg-purple-50" title="作为子种源从上游生成">↑ 来源</span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${CIRCULATION_COLORS[r.circulationType] || 'text-gray-600 bg-gray-50'}`}>
                        {CIRCULATION_TYPE_LABELS[r.circulationType] || r.circulationType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.sourceModule === 'planting' ? '种植' : r.sourceModule === 'harvest' ? '采收' : r.sourceModule}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">{r.sourceCode || r.sourceId || '-'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {r.quantity != null ? `${r.quantity} ${r.unit || ''}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.circulationDate?.slice(0, 10) || r.createdAt?.slice(0, 10) || '-'}</td>
                    <td className="px-3 py-2">
                      {r.isRevoked ? (
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
          回流记录展示该种源的双向历史（↑来源 = 怎么来的；↓派生 = 派生了什么）。
          新建回流操作请在种植管理的「采收与结束」/「种植结束」弹窗中触发。
        </p>
      </div>
    </UnifiedModal>
  );
}
