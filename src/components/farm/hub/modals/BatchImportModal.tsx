/**
 * 批量导入任务模态框组件
 * 支持 CSV/XLSX 文件上传、预览和批量导入
 */
import React, { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { FARM_OPERATION_TYPES } from '../../../../types/farm/common';
import { taskDispatchFields } from '../../../../data/farmMockData';
import { Button } from '@/components/ui/button';

// 导入行类型
export interface ImportRow {
  type: string;
  typeLabel: string;
  field: string;
  crop: string;
  assignee: string;
  planStart: string;
  planEnd: string;
  priority: string;
  estimatedDays?: number;
  estimatedHours?: number;
  [key: string]: string | number | undefined;
}

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ImportRow[]) => void;
}

// 解析CSV文件
const parseCSV = (file: File): Promise<ImportRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          reject(new Error('文件内容为空或格式不正确'));
          return;
        }

        // 解析表头
        const headers = lines[0].split(',').map(h => h.trim());

        // 解析数据行
        const data: ImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= 7) {
            const typeValue = values[0].toLowerCase();
            const taskType = FARM_OPERATION_TYPES.find(t =>
              t.value === typeValue || t.label === values[0]
            );

            data.push({
              type: taskType?.value || typeValue || 'irrigation',
              typeLabel: taskType?.label || values[0] || '灌溉',
              field: values[1] || '',
              crop: values[2] || '',
              assignee: values[3] || '',
              planStart: values[4] || '',
              planEnd: values[5] || '',
              priority: values[6] || 'normal',
            });
          }
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

/**
 * 批量导入任务模态框
 * 提供文件上传、预览和确认导入功能
 */
export function BatchImportModal({ isOpen, onClose, onImport }: BatchImportModalProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importData, setImportData] = useState<ImportRow[]>([]);

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'csv' && fileExt !== 'xlsx') {
      alert('请上传 CSV 或 XLSX 格式的文件');
      return;
    }

    setImportFile(file);

    try {
      const data = await parseCSV(file);
      setImportData(data);
      setImportPreview(data.slice(0, 5));
    } catch (error) {
      alert('文件解析失败：请确保CSV格式正确，包含正确的表头和数据');
      setImportFile(null);
      setImportPreview([]);
      setImportData([]);
    }
  };

  // 处理文件拖拽
  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'csv' && fileExt !== 'xlsx') {
      alert('请上传 CSV 或 XLSX 格式的文件');
      return;
    }

    setImportFile(file);

    try {
      const data = await parseCSV(file);
      setImportData(data);
      setImportPreview(data.slice(0, 5));
    } catch (error) {
      alert('文件解析失败：请确保CSV格式正确，包含正确的表头和数据');
      setImportFile(null);
      setImportPreview([]);
      setImportData([]);
    }
  };

  // 关闭并重置状态
  const handleClose = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportData([]);
    onClose();
  };

  // 确认导入
  const handleConfirm = () => {
    if (importData.length === 0) {
      alert('没有可导入的数据');
      return;
    }
    onImport(importData);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-900">批量导入任务</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5 text-gray-400" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* 文件上传区域 */}
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              importFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              id="batch-file-upload"
            />
            <label htmlFor="batch-file-upload" className="cursor-pointer">
              {importFile ? (
                <div>
                  <Upload className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">{importFile.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    点击或拖拽文件到此处重新上传
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-gray-900">点击上传或拖拽文件到此处</p>
                  <p className="text-sm text-gray-500 mt-1">
                    支持 CSV、XLSX 格式文件
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* CSV格式说明 */}
          {!importFile && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-2">CSV文件格式要求</h4>
              <p className="text-sm text-gray-600 mb-2">
                请确保CSV文件包含以下列（按顺序）：
              </p>
              <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                任务类型,任务区域,作物,执行人,计划开始时间,计划结束时间,优先级
              </code>
              <p className="text-xs text-gray-500 mt-2">
                示例：irrigation,1号棚,番茄,张三,2024-03-20 08:00,2024-03-20 12:00,normal
              </p>
            </div>
          )}

          {/* 预览表格 */}
          {importPreview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700">数据预览（前5条）</h4>
                <span className="text-sm text-gray-500">
                  共 {importData.length} 条数据
                </span>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">任务类型</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">任务区域</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">作物</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">执行人</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">计划开始时间</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">任务工时</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {importPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-100 transition-colors">
                        <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{row.typeLabel || '未知类型'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{row.field}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{row.crop}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{row.assignee}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                          {row.planStart?.split(' ')[0] || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                          {row.estimatedDays || 0}天{row.estimatedHours || 0}小时
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            row.priority === 'urgent'
                              ? 'bg-red-100 text-red-700'
                              : row.priority === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {row.priority === 'urgent' ? '紧急' : row.priority === 'high' ? '高' : '普通'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose}>
            取消
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            disabled={importData.length === 0}
          >
            确认导入 {importData.length > 0 && `(${importData.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
