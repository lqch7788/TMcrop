/**
 * 入库导出弹窗组件
 * 从 InboundModals 拆分出来，独立管理导出弹窗
 */

import React, { useState } from 'react';
import { InboundRecord } from '../../../types/warehouseInbound.types';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
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

  const generateFileName = (format: string) => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `物料入库记录_${timestamp}_${records.length}条.${format}`;
  };

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
        rows.push([
          index === 0 ? record.code : '',
          index === 0 ? record.inboundDate : '',
          index === 0 ? record.supplier : '',
          index === 0 ? record.operator : '',
          index === 0 ? statusText : '',
          `${index + 1}/${materialCount}`,
          material.code, material.name, material.category || '',
          material.specification || '', material.barcode || '',
          material.unit, material.quantity, material.price || '',
          material.batchNo || '', material.productionDate || '',
          material.expiryDate || '', material.location || '',
          material.remarks || ''
        ]);
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
          material.code, material.name, material.category || '',
          material.specification || '', material.barcode || '',
          material.unit, String(material.quantity), material.price || '',
          material.batchNo || '', material.productionDate || '',
          material.expiryDate || '', material.location || '',
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
      case 'excel': exportToExcel(); break;
      case 'csv': exportToCsv(); break;
    }
    onClose();
  };

  const formats = [
    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter={true}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleExport} className="flex-1">确认导出</Button>
        </div>
      }
    >
      <p className="text-sm text-gray-500 mb-4">已选择 {records.length} 条入库记录</p>
      <div className="space-y-3">
        {formats.map((format) => (
          <div
            key={format.value}
            onClick={() => setExportFormat(format.value)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
              exportFormat === format.value ? 'border-emerald-500' : 'border-gray-400'
            }`}>
              {exportFormat === format.value && (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-900">{format.label}</span>
              <span className="block text-xs text-gray-500">{format.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </UnifiedModal>
  );
};

export default InboundExportModal;
