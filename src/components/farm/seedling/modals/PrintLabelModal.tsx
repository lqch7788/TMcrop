/**
 * 育苗标签打印弹窗
 * 支持新建打印和重打印功能
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling, LabelPrintType, PrintRecord } from '../../../../types/crop';
import { getPrintRecords, printLabel, generateAllLabelNumbers } from '../../../../services/seedlingService';
import { OPERATORS } from '../../../../data/cropData';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

export function PrintLabelModal({ isOpen, onClose, record }: PrintLabelModalProps) {
  const [template, setTemplate] = useState<'small' | 'large' | 'detail'>('detail');
  const [printType, setPrintType] = useState<'new' | 'reprint'>('new');
  const [printCount, setPrintCount] = useState(1);
  const [operator, setOperator] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [printHistory, setPrintHistory] = useState<PrintRecord[]>([]);

  // 加载打印记录
  useEffect(() => {
    if (isOpen) {
      const history = getPrintRecords(record.id);
      setPrintHistory(history);
    }
  }, [isOpen, record.id]);

  // 获取所有可打印的二维码编号
  const allLabelNumbers = generateAllLabelNumbers(record.id);

  const handlePrint = () => {
    if (!operator) {
      alert('请选择操作人员');
      return;
    }

    if (printType === 'new') {
      // 新建打印
      printLabel(record.id, LabelPrintType.NEW, printCount, operator);
    } else {
      // 重打印
      if (selectedLabels.length === 0) {
        alert('请选择要重打印的二维码编号');
        return;
      }
      printLabel(record.id, LabelPrintType.REPRINT, selectedLabels.length, operator, selectedLabels);
    }

    // 刷新历史记录
    setPrintHistory(getPrintRecords(record.id));

    // 触发浏览器打印
    window.print();
  };

  // 切换打印类型
  const handlePrintTypeChange = (type: 'new' | 'reprint') => {
    setPrintType(type);
    setSelectedLabels([]);
    setPrintCount(1);
  };

  // 选择/取消选择二维码编号
  const toggleLabel = (label: string) => {
    if (selectedLabels.includes(label)) {
      setSelectedLabels(selectedLabels.filter(l => l !== label));
    } else {
      setSelectedLabels([...selectedLabels, label]);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedLabels.length === allLabelNumbers.length) {
      setSelectedLabels([]);
    } else {
      setSelectedLabels([...allLabelNumbers]);
    }
  };

  // 二维码内容：包含完整溯源信息
  const qrCodeValue = JSON.stringify({
    type: 'seedling',
    code: record.seedlingCode,
    sourceCode: record.sourceCode,
    cropCode: record.cropCode,
    cropName: record.cropName,
    variety: record.cropVariety,
    quantity: record.survivalCount,
    site: record.siteName,
    date: record.startDate
  });

  // 计算剩余数量
  const remainingCount = record.initialCount - record.lossCount;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="打印标签"
      size="md"
      showFooter={true}
      onSubmit={handlePrint}
      submitText="打印"
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 打印类型选择 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="printType"
                value="new"
                checked={printType === 'new'}
                onChange={() => handlePrintTypeChange('new')}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm font-medium">新建打印</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="printType"
                value="reprint"
                checked={printType === 'reprint'}
                onChange={() => handlePrintTypeChange('reprint')}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm font-medium">重打印</span>
            </label>
          </div>

          {/* 新建打印选项 */}
          {printType === 'new' && (
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">打印数量</label>
                <input
                  type="number"
                  min="1"
                  max={record.initialCount}
                  value={printCount}
                  onChange={(e) => setPrintCount(Math.max(1, Math.min(record.initialCount, Number(e.target.value))))}
                  className="w-24 px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div className="text-xs text-gray-500">
                育苗批号将生成 {printCount} 个二维码编号
              </div>
            </div>
          )}

          {/* 重打印选项 */}
          {printType === 'reprint' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-600">选择要重打印的二维码（已选 {selectedLabels.length} 个）</label>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {selectedLabels.length === allLabelNumbers.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                <div className="grid grid-cols-4 gap-1">
                  {allLabelNumbers.slice(0, 50).map(label => (
                    <label
                      key={label}
                      className={`flex items-center gap-1 p-1 rounded cursor-pointer text-xs ${
                        selectedLabels.includes(label) ? 'bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLabels.includes(label)}
                        onChange={() => toggleLabel(label)}
                        className="w-3 h-3"
                      />
                      <span className="truncate">{label}</span>
                    </label>
                  ))}
                </div>
                {allLabelNumbers.length > 50 && (
                  <div className="text-xs text-gray-500 mt-2">
                    共 {allLabelNumbers.length} 个二维码，已显示前50个
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 操作人员 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">操作人员</label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">请选择操作人员</option>
            {OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        {/* 模板选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">标签模板</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="template"
                value="small"
                checked={template === 'small'}
                onChange={() => setTemplate('small')}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm">小标签</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="template"
                value="large"
                checked={template === 'large'}
                onChange={() => setTemplate('large')}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm">大标签</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="template"
                value="detail"
                checked={template === 'detail'}
                onChange={() => setTemplate('detail')}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm">详情标签</span>
            </label>
          </div>
        </div>

        {/* 标签预览 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
          {template === 'small' ? (
            /* 小标签 */
            <div className="flex flex-col items-center print-label">
              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                <QRCodeSVG value={qrCodeValue} size={80} />
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm font-bold text-gray-900">{record.seedlingCode}</div>
                <div className="text-xs text-gray-600 mt-1">{record.cropName}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {remainingCount.toLocaleString()} 株
                </div>
              </div>
            </div>
          ) : template === 'large' ? (
            /* 大标签 */
            <div className="flex flex-col items-center print-label">
              <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <QRCodeSVG value={qrCodeValue} size={100} />
              </div>
              <div className="mt-4 text-center">
                <div className="text-lg font-bold text-gray-900">{record.seedlingCode}</div>
                <div className="text-sm text-gray-600 mt-2">{record.cropName} - {record.cropVariety}</div>
                <div className="text-sm text-gray-600 mt-1">
                  剩余：{remainingCount.toLocaleString()} 株
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  场地：{record.siteName}
                </div>
              </div>
            </div>
          ) : (
            /* 详情标签 - 完整信息 */
            <div className="flex print-label">
              <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex-shrink-0">
                <QRCodeSVG value={qrCodeValue} size={100} />
              </div>
              <div className="ml-4 flex flex-col justify-center">
                <div className="text-lg font-bold text-gray-900 mb-2">{record.seedlingCode}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="text-gray-500">作物名称：</div>
                  <div className="text-gray-900 font-medium">{record.cropName}</div>
                  <div className="text-gray-500">作物品种：</div>
                  <div className="text-gray-900">{record.cropVariety}</div>
                  <div className="text-gray-500">作物编码：</div>
                  <div className="text-gray-900 font-mono text-xs">{record.cropCode || '-'}</div>
                  <div className="text-gray-500">育苗方式：</div>
                  <div className="text-gray-900">{record.seedlingType || '-'}</div>
                  <div className="text-gray-500">场地：</div>
                  <div className="text-gray-900">{record.siteName}</div>
                  <div className="text-gray-500">种源批号：</div>
                  <div className="text-gray-900 font-mono text-xs">{record.sourceCode}</div>
                </div>
              </div>
              <div className="ml-4 flex flex-col justify-center border-l border-gray-200 pl-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="text-gray-500">初始数量：</div>
                  <div className="text-gray-900">{record.initialCount.toLocaleString()}</div>
                  <div className="text-gray-500">剩余数量：</div>
                  <div className="text-emerald-600 font-bold">{remainingCount.toLocaleString()}</div>
                  <div className="text-gray-500">成苗率：</div>
                  <div className="text-emerald-600">{record.survivalRate}%</div>
                  <div className="text-gray-500">育苗日期：</div>
                  <div className="text-gray-900">{record.startDate}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500 text-center">
          点击"打印"按钮使用浏览器打印功能
        </div>
        <div className="text-xs text-gray-400 text-center">
          标签包含二维码，扫描可获取完整溯源信息
        </div>

        {/* 打印历史记录（新增） */}
        {printHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">打印历史</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {printHistory.slice(-5).reverse().map((record) => (
                <div key={record.id} className="bg-gray-50 rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded ${
                      record.printType === 'new' ? 'bg-green-100 text-green-700' :
                      record.printType === 'reprint' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {record.printType === 'new' ? '新建' : record.printType === 'reprint' ? '重打印' : '批量'}
                    </span>
                    <span className="text-gray-500">{record.printTime}</span>
                  </div>
                  <div className="mt-1 text-gray-600">
                    操作员: {record.operator} | 数量: {record.printCount}
                    {record.labelNumbers && record.labelNumbers.length > 0 && (
                      <span className="ml-2">标签: {record.labelNumbers.slice(0, 3).join(', ')}
                        {record.labelNumbers.length > 3 && `...等${record.labelNumbers.length}个`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-label, .print-label * { visibility: visible; }
          .print-label { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </UnifiedModal>
  );
}
