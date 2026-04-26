/**
 * 育苗标签打印弹窗
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Seedling } from '../../../../types/crop';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Seedling;
}

export function PrintLabelModal({ isOpen, onClose, record }: PrintLabelModalProps) {
  const [template, setTemplate] = useState<'small' | 'large'>('small');

  const handlePrint = () => {
    window.print();
  };

  const qrCodeValue = JSON.stringify({
    type: 'seedling',
    code: record.seedlingCode,
    sourceCode: record.sourceCode,
    cropName: record.cropName
  });

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
        {/* 模板选择 */}
        <div className="flex gap-4 mb-4">
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
        </div>

        {/* 标签预览 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          {template === 'small' ? (
            <div className="flex flex-col items-center">
              <div className="bg-white p-3 border border-gray-200 rounded-lg">
                <QRCodeSVG value={qrCodeValue} size={80} />
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm font-bold text-gray-900">{record.seedlingCode}</div>
                <div className="text-xs text-gray-600 mt-1">{record.cropName}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {record.survivalCount.toLocaleString()} 株
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 border border-gray-200 rounded-lg">
                <QRCodeSVG value={qrCodeValue} size={120} />
              </div>
              <div className="mt-4 text-center">
                <div className="text-lg font-bold text-gray-900">{record.seedlingCode}</div>
                <div className="text-sm text-gray-600 mt-2">{record.cropName} - {record.cropVariety}</div>
                <div className="text-sm text-gray-600 mt-1">
                  数量：{record.survivalCount.toLocaleString()} 株
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  场地：{record.siteName}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  关联种源：{record.sourceCode}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500 text-center">
          点击"打印"按钮使用浏览器打印功能
        </div>
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
