/**
 * 种植移入/移出记录查看弹窗
 * 2026-06-19: 整批级别移入/移出履历展示
 *
 * 数据源：planting_move_records 表（POST /api/plantings/:id/move 写入）
 * 展示：操作日期 / 类型 / 数量 / 原区域 → 目标区域 / 操作员 / 备注
 */
import React, { useEffect, useState } from 'react';
import { History, MoveRight, Download } from 'lucide-react';
import { Label, UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { getPlantingMoveRecords } from '@/services/apiPlantingService';
import type { Planting } from '../../../../types/crop';

interface PlantingMoveRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  planting: Planting;
}

interface MoveRecord {
  id: string;
  planting_id: string;
  planting_code?: string;
  operation_type: 'move_in' | 'move_out';
  from_area_id?: string;
  from_area_name?: string;
  to_area_id?: string;
  to_area_name?: string;
  quantity: number;
  operation_date: string;
  operator_name?: string;
  remarks?: string;
  create_time?: string;
}

export default function PlantingMoveRecordsModal({ isOpen, onClose, planting }: PlantingMoveRecordsModalProps) {
  const [records, setRecords] = useState<MoveRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getPlantingMoveRecords(planting.id);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) {
      await showAlert(`加载移入/移出记录失败：${e?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, planting.id]);

  const handleExport = () => {
    if (records.length === 0) {
      void showAlert('没有记录可导出');
      return;
    }
    const headers = ['操作日期', '类型', '原区域', '目标区域', '数量', '操作员', '备注'];
    const rows = records.map((r) => [
      r.operation_date || '',
      r.operation_type === 'move_in' ? '移入' : '移出',
      r.from_area_name || '-',
      r.to_area_name || '-',
      String(r.quantity || 0),
      r.operator_name || '-',
      r.remarks || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `移入移出记录_${planting.plantCode}_${todayLocal()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`移入/移出记录 - ${planting.plantCode}`}
      size="xxl"
      showFooter={true}
      onSubmit={onClose}
      submitText="关闭"
      cancelText="关闭"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4" />
            历史记录 ({records.length} 条)
          </h4>
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中…</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg">
            暂无移入/移出记录
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-blue-500 text-white sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left">操作日期</th>
                  <th className="px-2 py-2 text-left">类型</th>
                  <th className="px-2 py-2 text-left">原区域</th>
                  <th className="px-2 py-2 text-left">目标区域</th>
                  <th className="px-2 py-2 text-right">数量（株）</th>
                  <th className="px-2 py-2 text-left">操作员</th>
                  <th className="px-2 py-2 text-left">备注</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-2 py-1.5">{r.operation_date || '-'}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        r.operation_type === 'move_in'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        <MoveRight className={`w-3 h-3 ${r.operation_type === 'move_out' ? 'rotate-180' : ''}`} />
                        {r.operation_type === 'move_in' ? '移入' : '移出'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">{r.from_area_name || '-'}</td>
                    <td className="px-2 py-1.5">{r.to_area_name || '-'}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{(r.quantity || 0).toLocaleString()}</td>
                    <td className="px-2 py-1.5">{r.operator_name || '-'}</td>
                    <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]" title={r.remarks || ''}>
                      {r.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
