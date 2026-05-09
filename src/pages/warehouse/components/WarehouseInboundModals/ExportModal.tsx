/**
 * 入库导出弹窗组件
 * 从 InboundModals 拆分出来，独立管理导出弹窗
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { InboundRecord } from '../../../types/warehouseInbound.types';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

interface InboundExportModalProps {
  records: InboundRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export const InboundExportModal: React.FC<InboundExportModalProps> = ({
  records,
  isOpen,
  onClose,
}) => {
  const [exportFormat, setExportFormat] = useState('excel');

  if (!isOpen) return null;

  // 生成导出文件名
  const generateFileName = (format: string) => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const recordCount = records.length;
    return `物料入库记录_${timestamp}_${recordCount}条.${format}`;
  };

  // 导出为Excel格式
  const exportToExcel = () => {
    const headers = [
      '入库单号', '入库日期', '供应商', '操作员', '状态', '序号',
      '物料编码', '物料名称', '分类', '规格', '条形码', '单位',
      '数量', '单价', '批号', '生产日期', '有效期至', '存放位置', '备注'
    ];

    const rows: (string | number)[][] = [];

    records.forEach(record => {
      const materialCount = record.materials.length;
      const statusText = record.status === 'pending' ? '待审核' : record.status === 'completed' ? '已完成' : '已作废';

      record.materials.forEach((material, index) => {
        const materialRow = [
          index === 0 ? record.code : '',
          index === 0 ? record.inboundDate : '',
          index === 0 ? record.supplier : '',
          index === 0 ? record.operator : '',
          index === 0 ? statusText : '',
          `${index + 1}/${materialCount}`,
          material.materialCode,
          material.materialName,
          material.category || '',
          material.specification || '',
          material.barcode || '',
          material.unit,
          material.quantity,
          material.price || '',
          material.batchNo || '',
          material.productionDate || '',
          material.expiryDate || '',
          material.location || '',
          material.remarks || ''
        ];
        rows.push(materialRow);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 8 },
      { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '物料入库记录');
    XLSX.writeFile(workbook, generateFileName('xlsx'));
  };

  // 导出为CSV格式
  const exportToCsv = () => {
    const headers = [
      '入库单号', '入库日期', '供应商', '操作员', '状态', '序号',
      '物料编码', '物料名称', '分类', '规格', '条形码', '单位',
      '数量', '单价', '批号', '生产日期', '有效期至', '存放位置', '备注'
    ];

    const rows: string[][] = [];

    records.forEach(record => {
      const statusText = record.status === 'pending' ? '待审核' : record.status === 'completed' ? '已完成' : '已作废';
      const materialCount = record.materials.length;

      record.materials.forEach((material, index) => {
        rows.push([
          index === 0 ? record.code : '',
          index === 0 ? record.inboundDate : '',
          index === 0 ? record.supplier : '',
          index === 0 ? record.operator : '',
          index === 0 ? statusText : '',
          `${index + 1}/${materialCount}`,
          material.materialCode,
          material.materialName,
          material.category || '',
          material.specification || '',
          material.barcode || '',
          material.unit,
          String(material.quantity),
          material.price || '',
          material.batchNo || '',
          material.productionDate || '',
          material.expiryDate || '',
          material.location || '',
          material.remarks || ''
        ]);
      });
    });

    const BOM = '﻿';
    const csvContent = BOM + [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = generateFileName('csv');
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExport = () => {
    switch (exportFormat) {
      case 'excel':
        exportToExcel();
        break;
      case 'csv':
        exportToCsv();
        break;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">已选择 {records.length} 条入库记录</p>

          {/* 格式选项 */}
          <div className="space-y-3">
            {[
              { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
              { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
            ].map((format) => (
              <label
                key={format.value}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  exportFormat === format.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="exportFormat"
                  value={format.value}
                  checked={exportFormat === format.value}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">{format.label}</span>
                  <span className="block text-xs text-gray-500">{format.desc}</span>
                </div>
              </label>
            ))}
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button onClick={handleExport} className="flex-1">
              确认导出
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboundExportModal;
