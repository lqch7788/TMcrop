/**
 * 入库新增弹窗组件
 * 从 InboundModals 拆分出来，独立管理新增入库记录弹窗
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { InboundRecord, InboundMaterial } from '../../../types/warehouseInbound.types';
import { Button } from '@/components/ui/button';
import { currentUser } from '@/data/mockData';

interface InboundAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<InboundRecord, 'id'>) => void;
  onGenerateCode: () => string;
  existingCodes: string[];
}

export const InboundAddModal: React.FC<InboundAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onGenerateCode,
  existingCodes,
}) => {
  // 获取当天日期字符串
  const today = new Date().toISOString().split('T')[0];

  // 表单数据状态
  const [formData, setFormData] = useState({
    code: '',
    inboundDate: today,
    supplier: '',
    operator: currentUser.name,
  });

  // 物料列表状态
  const [materials, setMaterials] = useState<InboundMaterial[]>([]);

  // 编码错误状态
  const [codeError, setCodeError] = useState('');

  // 弹窗大小状态
  const [isMaximized, setIsMaximized] = useState(false);

  // 拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });

  // 拖动开始处理
  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const dialog = document.getElementById('inbound-add-dialog');
    if (dialog) {
      const rect = dialog.getBoundingClientRect();
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        left: rect.left,
        top: rect.top,
      });
    }
  };

  // 拖动处理
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const dialog = document.getElementById('inbound-add-dialog');
      if (dialog) {
        dialog.style.position = 'fixed';
        dialog.style.left = `${dragStart.left + deltaX}px`;
        dialog.style.top = `${dragStart.top + deltaY}px`;
        dialog.style.margin = '0';
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // 最大化/还原切换
  const toggleMaximize = () => {
    const dialog = document.getElementById('inbound-add-dialog');
    if (!isMaximized && dialog) {
      dialog.style.width = '100vw';
      dialog.style.height = '100vh';
      dialog.style.maxWidth = 'none';
      dialog.style.maxHeight = 'none';
      dialog.style.borderRadius = '0';
    } else if (dialog) {
      dialog.style.width = '';
      dialog.style.height = '';
      dialog.style.maxWidth = '';
      dialog.style.maxHeight = '';
      dialog.style.borderRadius = '';
    }
    setIsMaximized(!isMaximized);
  };

  // 生成入库单号（带自动查重）
  const handleGenerateCode = () => {
    let newCode = onGenerateCode();
    let attempts = 0;
    const maxAttempts = 999;

    while (existingCodes.includes(newCode) && attempts < maxAttempts) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayPrefix = `RK${todayStr.replace(/-/g, '')}-`;
      const seq = parseInt(newCode.replace(todayPrefix, ''), 10);
      const nextSeq = seq + 1;
      if (nextSeq > 999) {
        setCodeError('今日编号已达上限999');
        return;
      }
      newCode = `${todayPrefix}${String(nextSeq).padStart(3, '0')}`;
      attempts++;
    }

    if (existingCodes.includes(newCode)) {
      setCodeError('编号生成失败，请稍后重试');
      return;
    }

    setFormData({ ...formData, code: newCode });
    setCodeError('');
  };

  // 添加物料
  const handleAddMaterial = () => {
    const newMaterial: InboundMaterial = {
      id: Date.now(),
      materialCode: '',
      materialName: '',
      category: '',
      bigCategory: '',
      midCategory: '',
      subCategory: '',
      specification: '',
      barcode: '',
      unit: '袋',
      quantity: 0,
      price: '',
      supplier: '',
      location: '',
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      remarks: '',
    };
    setMaterials([...materials, newMaterial]);
  };

  // 修改物料
  const handleMaterialChange = (id: number, field: keyof InboundMaterial, value: string | number) => {
    setMaterials(materials.map(m =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // 删除物料
  const handleDeleteMaterial = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  // 提交表单
  const handleSubmit = () => {
    onSave({
      code: formData.code || onGenerateCode(),
      inboundDate: formData.inboundDate,
      supplier: formData.supplier,
      operator: formData.operator,
      status: 'pending' as const,
      materials,
    });
    setFormData({
      code: '',
      inboundDate: today,
      supplier: '',
      operator: currentUser.name,
    });
    setMaterials([]);
    onClose();
  };

  // 如果弹窗未打开，不渲染任何内容
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        id="inbound-add-dialog"
        className="bg-white rounded-xl w-full max-w-6xl shadow-xl max-h-[90vh] flex flex-col relative"
      >
        {/* 标题栏 */}
        <div
          className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600 flex-shrink-0 cursor-move"
          onMouseDown={handleDragStart}
        >
          <h3 className="text-lg font-semibold text-white select-none">新增入库记录</h3>
          <div className="flex items-center gap-1">
            {/* 最大化/还原按钮 */}
            <button
              onClick={toggleMaximize}
              className="text-white hover:bg-emerald-700 p-1.5 rounded transition-colors"
              title={isMaximized ? '还原' : '最大化'}
            >
              {isMaximized ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v2m0 4v2a2 2 0 002 2h2m8 0h2a2 2 0 002-2v-2m0-4V6a2 2 0 00-2-2h-2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            {/* 关闭按钮 */}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 基本信息区域 */}
        <div className="p-4 bg-emerald-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 入库单号 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">入库单号</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    setFormData({ ...formData, code: e.target.value });
                    setCodeError('');
                  }}
                  placeholder="点击生成"
                  className="flex-1 h-8 px-2 border border-gray-200 rounded text-sm font-mono"
                />
                <Button variant="blue" size="sm" onClick={handleGenerateCode} title="生成入库单号">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
              </div>
              {codeError && <span className="text-xs text-red-500 mt-0.5">{codeError}</span>}
            </div>

            {/* 入库日期 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">入库日期</label>
              <input
                type="date"
                value={formData.inboundDate}
                readOnly
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* 供应商 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">供应商</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm"
              />
            </div>

            {/* 操作员 */}
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">操作员</label>
              <input
                type="text"
                value={formData.operator}
                readOnly
                className="w-full h-8 px-2 border border-gray-200 rounded text-sm bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* 物料明细区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">物料明细（{materials.length}种物料）</h4>
            <Button variant="blue" size="sm" onClick={handleAddMaterial}>
              <Plus className="w-3 h-3" />
              添加物料
            </Button>
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无物料，请点击"添加物料"按钮添加
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">操作</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">物料编码</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">物料名称</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">分类</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">规格</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">条形码</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">单位</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">数量</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">单价</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">供应商</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">存放位置</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">批号</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">生产日期</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">有效期至</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materials.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteMaterial(m.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.materialCode}
                          onChange={(e) => handleMaterialChange(m.id, 'materialCode', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.materialName}
                          onChange={(e) => handleMaterialChange(m.id, 'materialName', e.target.value)}
                          className="w-24 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.category}
                          onChange={(e) => handleMaterialChange(m.id, 'category', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.specification}
                          onChange={(e) => handleMaterialChange(m.id, 'specification', e.target.value)}
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.barcode}
                          onChange={(e) => handleMaterialChange(m.id, 'barcode', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.unit}
                          onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                          className="w-12 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="number"
                          value={m.quantity}
                          onChange={(e) => handleMaterialChange(m.id, 'quantity', Number(e.target.value))}
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.price}
                          onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.supplier}
                          onChange={(e) => handleMaterialChange(m.id, 'supplier', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.location}
                          onChange={(e) => handleMaterialChange(m.id, 'location', e.target.value)}
                          className="w-16 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.batchNo}
                          onChange={(e) => handleMaterialChange(m.id, 'batchNo', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="date"
                          value={m.productionDate}
                          onChange={(e) => handleMaterialChange(m.id, 'productionDate', e.target.value)}
                          className="w-24 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="date"
                          value={m.expiryDate}
                          onChange={(e) => handleMaterialChange(m.id, 'expiryDate', e.target.value)}
                          className="w-24 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={m.remarks}
                          onChange={(e) => handleMaterialChange(m.id, 'remarks', e.target.value)}
                          className="w-20 h-6 px-1 border border-gray-200 rounded text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            提交
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InboundAddModal;
