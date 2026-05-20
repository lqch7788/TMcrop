/**
 * 入库新增弹窗组件
 * 从 InboundModals 拆分出来，独立管理新增入库记录弹窗
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { InboundRecord, InboundMaterial } from '../../../types/warehouseInbound.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/NumberInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useUserStore } from '@/stores/useUserStore';
import { useSupplierStore } from '@/stores/useSupplierStore';
import { useWarehouseMaterialStore } from '@/stores/useWarehouseMaterialStore';

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
  // 获取当前用户信息（从 Zustand Store）
  const storeUsers = useUserStore(state => state.users);
  const currentUserName = storeUsers[0]?.name || localStorage.getItem('username') || '当前用户';
  // 获取当天日期字符串
  const today = new Date().toISOString().split('T')[0];

  // 供应商列表（从 Zustand Store 获取）
  const suppliers = useSupplierStore((s) => s.items);
  const loadSuppliers = useSupplierStore((s) => s.loadItems);

  // 仓库已有物料列表（用于输入物料名称时自动关联）
  const warehouseMaterials = useWarehouseMaterialStore((s) => s.items);
  const loadWarehouseMaterials = useWarehouseMaterialStore((s) => s.loadItems);

  // 弹窗打开时加载供应商列表和物料列表
  useEffect(() => {
    if (isOpen) {
      if (suppliers.length === 0) loadSuppliers();
      if (warehouseMaterials.length === 0) loadWarehouseMaterials();
    }
  }, [isOpen, suppliers.length, loadSuppliers, warehouseMaterials.length, loadWarehouseMaterials]);

  // 物料名称搜索输入 → 更新搜索词并打开下拉
  const handleMaterialSearchChange = (materialId: number, query: string) => {
    setMaterialSearchQueries(prev => ({ ...prev, [materialId]: query }));
    setOpenDropdowns(prev => ({ ...prev, [materialId]: true }));
    // 同时更新物料行名称字段
    setMaterials(materials.map(m =>
      m.id === materialId ? { ...m, name: query } : m
    ));
  };

  // 选中下拉物料 → 自动填充基本信息
  const handleSelectMaterial = (materialId: number, wm: typeof warehouseMaterials[number]) => {
    setMaterials(materials.map(m => {
      if (m.id !== materialId) return m;
      return {
        ...m,
        name: wm.name,
        code: wm.code || m.code,
        category: wm.category || m.category,
        specification: wm.specification || m.specification,
        barcode: wm.barcode || m.barcode,
        unit: wm.unit || m.unit,
        price: wm.price || m.price,
        location: wm.location || m.location,
      };
    }));
    setMaterialSearchQueries(prev => ({ ...prev, [materialId]: wm.name }));
    setOpenDropdowns(prev => ({ ...prev, [materialId]: false }));
  };

  // 表单数据状态
  const [formData, setFormData] = useState({
    code: '',
    inboundDate: today,
    supplier: '',
    operator: currentUserName,
    status: 'completed' as 'completed' | 'pending',
  });

  // 物料列表状态
  const [materials, setMaterials] = useState<InboundMaterial[]>([]);

  // 物料名称搜索状态（每个物料行独立）
  const [materialSearchQueries, setMaterialSearchQueries] = useState<Record<number, string>>({});
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>({});
  // 输入框 ref 映射：用于计算下拉菜单的 fixed 定位
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // 获取某个物料行的搜索结果（最多显示8条）
  const getFilteredMaterials = (materialId: number) => {
    const query = (materialSearchQueries[materialId] || '').trim().toLowerCase();
    if (!query) return warehouseMaterials.filter(wm => wm.dataStatus === '启用').slice(0, 8);
    return warehouseMaterials
      .filter(wm => wm.dataStatus === '启用' && (
        wm.name.toLowerCase().includes(query) ||
        wm.code.toLowerCase().includes(query)
      ))
      .slice(0, 8);
  };

  // 编码错误状态
  const [codeError, setCodeError] = useState('');

  // 弹窗大小和位置状态
  const [isMaximized, setIsMaximized] = useState(false);
  const [dialogSize, setDialogSize] = useState({ width: 0, height: 0 });
  const [dialogPos, setDialogPos] = useState({ left: 0, top: 0 });
  const minSize = { width: 640, height: 400 };

  // 拖动状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });

  // 缩放状态
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, left: 0, top: 0 });

  // 弹窗打开时记录初始尺寸和居中位置
  useEffect(() => {
    if (isOpen) {
      const dialog = document.getElementById('inbound-add-dialog');
      if (dialog) {
        const rect = dialog.getBoundingClientRect();
        setDialogSize({ width: rect.width, height: rect.height });
        setDialogPos({ left: rect.left, top: rect.top });
      }
    }
  }, [isOpen]);

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

  // 缩放开始处理
  const handleResizeStart = (e: React.MouseEvent, dir: string) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDir(dir);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: dialogSize.width,
      h: dialogSize.height,
      left: dialogPos.left,
      top: dialogPos.top,
    });
  };

  // 拖动 + 缩放 统一处理
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const dialog = document.getElementById('inbound-add-dialog');
        if (dialog) {
          dialog.style.position = 'fixed';
          dialog.style.left = `${dragStart.left + deltaX}px`;
          dialog.style.top = `${dragStart.top + deltaY}px`;
          dialog.style.margin = '0';
        }
      }
      if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        let newW = resizeStart.w;
        let newH = resizeStart.h;
        let newLeft = resizeStart.left;
        let newTop = resizeStart.top;

        if (resizeDir.includes('e')) newW = Math.max(minSize.width, resizeStart.w + dx);
        if (resizeDir.includes('s')) newH = Math.max(minSize.height, resizeStart.h + dy);
        if (resizeDir.includes('w')) {
          newW = Math.max(minSize.width, resizeStart.w - dx);
          newLeft = resizeStart.left + (resizeStart.w - newW);
        }
        if (resizeDir.includes('n')) {
          newH = Math.max(minSize.height, resizeStart.h - dy);
          newTop = resizeStart.top + (resizeStart.h - newH);
        }

        const dialog = document.getElementById('inbound-add-dialog');
        if (dialog) {
          dialog.style.position = 'fixed';
          dialog.style.width = `${newW}px`;
          dialog.style.height = `${newH}px`;
          dialog.style.left = `${newLeft}px`;
          dialog.style.top = `${newTop}px`;
          dialog.style.margin = '0';
          dialog.style.maxWidth = 'none';
          dialog.style.maxHeight = 'none';
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        const dialog = document.getElementById('inbound-add-dialog');
        if (dialog) {
          const rect = dialog.getBoundingClientRect();
          setDialogPos({ left: rect.left, top: rect.top });
        }
      }
      if (isResizing) {
        const dialog = document.getElementById('inbound-add-dialog');
        if (dialog) {
          const rect = dialog.getBoundingClientRect();
          setDialogSize({ width: rect.width, height: rect.height });
          setDialogPos({ left: rect.left, top: rect.top });
        }
      }
      setIsDragging(false);
      setIsResizing(false);
      setResizeDir('');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDir, minSize.width, minSize.height]);

  // 最大化/还原切换
  const toggleMaximize = () => {
    const dialog = document.getElementById('inbound-add-dialog');
    const overlay = document.getElementById('inbound-add-overlay');
    if (!isMaximized && dialog) {
      // 最大化前保存当前尺寸和位置
      const rect = dialog.getBoundingClientRect();
      setDialogSize({ width: rect.width, height: rect.height });
      setDialogPos({ left: rect.left, top: rect.top });
      // 最大化：铺满视口
      dialog.style.position = 'fixed';
      dialog.style.top = '0';
      dialog.style.left = '0';
      dialog.style.width = '100vw';
      dialog.style.height = '100vh';
      dialog.style.maxWidth = 'none';
      dialog.style.maxHeight = 'none';
      dialog.style.borderRadius = '0';
      dialog.style.margin = '0';
      dialog.style.transform = 'none';
      if (overlay) {
        overlay.style.alignItems = 'flex-start';
        overlay.style.justifyContent = 'flex-start';
      }
    } else if (dialog) {
      // 还原：清除内联样式，恢复 CSS class 控制
      dialog.style.position = '';
      dialog.style.top = '';
      dialog.style.left = '';
      dialog.style.width = '';
      dialog.style.height = '';
      dialog.style.maxWidth = '';
      dialog.style.maxHeight = '';
      dialog.style.borderRadius = '';
      dialog.style.margin = '';
      dialog.style.transform = '';
      if (overlay) {
        overlay.style.alignItems = '';
        overlay.style.justifyContent = '';
      }
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
      code: '',
      name: '',
      category: '',
      bigCategory: '',
      midCategory: '',
      subCategory: '',
      specification: '',
      barcode: '',
      unit: '袋',
      quantity: 0,
      price: '',
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
      status: formData.status,
      materials,
    });
    setFormData({
      code: '',
      inboundDate: today,
      supplier: '',
      operator: currentUserName,
      status: 'completed',
    });
    setMaterials([]);
    onClose();
  };

  // 如果弹窗未打开，不渲染任何内容
  if (!isOpen) return null;

  return (
    <div id="inbound-add-overlay" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        id="inbound-add-dialog"
        className="bg-white rounded-xl w-full max-w-6xl shadow-xl max-h-[90vh] flex flex-col relative"
      >
        {/* 标题栏 */}
        <div
          className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 cursor-move rounded-t-xl"
          onMouseDown={handleDragStart}
        >
          <h3 className="text-lg font-semibold text-white select-none">新增入库记录</h3>
          <div className="flex items-center gap-1">
            {/* 最大化/还原按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMaximize}
              className="text-white hover:bg-emerald-500"
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
            </Button>
            {/* 关闭按钮 */}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 基本信息区域 */}
        <div className="p-4 bg-emerald-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* 入库单号 */}
            <div>
              <Label className="text-xs text-emerald-700">入库单号</Label>
              <div className="flex gap-1">
                <Input
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    setFormData({ ...formData, code: e.target.value });
                    setCodeError('');
                  }}
                  placeholder="点击生成"
                  className="flex-1 h-8 text-sm font-mono"
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
              <Label className="text-xs text-emerald-700">入库日期</Label>
              <DatePicker
                selected={formData.inboundDate ? new Date(formData.inboundDate) : undefined}
                onChange={() => {}}
                placeholder="入库日期"
                disabled
              />
            </div>

            {/* 供应商 */}
            <div>
              <Label className="text-xs text-emerald-700">供应商</Label>
              <Input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="选择或输入供应商名称"
                list="supplier-list"
                className="h-8 text-sm"
              />
              <datalist id="supplier-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            {/* 操作员 */}
            <div>
              <Label className="text-xs text-emerald-700">操作员</Label>
              <Input
                type="text"
                value={formData.operator}
                readOnly
                className="h-8 text-sm bg-gray-100"
              />
            </div>

            {/* 状态 */}
            <div>
              <Label className="text-xs text-emerald-700">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val as 'completed' | 'pending' })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 物料明细区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h4 className="text-sm font-semibold text-gray-800">物料明细（{materials.length}种物料）</h4>
              <span className="text-xs text-gray-400">|</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <span className="w-3 h-3 rounded border border-blue-300 bg-blue-50 inline-block"></span>
                自动关联
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <span className="w-3 h-3 rounded border border-yellow-300 bg-yellow-50 inline-block"></span>
                手动录入
              </span>
            </div>
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
              <Table className="min-w-full text-xs">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">操作</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">物料编码</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">物料名称</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">分类</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">规格</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">条形码</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">单位</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">数量</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">单价</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">存放位置</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">批号</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">生产日期</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">有效期至</TableHead>
                    <TableHead className="px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((m) => (
                    <TableRow key={m.id} className="hover:bg-gray-50">
                      <TableCell className="px-2 py-1.5 whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteMaterial(m.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.code}
                          onChange={(e) => handleMaterialChange(m.id, 'code', e.target.value)}
                          className="w-20 h-6 px-1 text-xs border-gray-300 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <div className="flex items-center">
                          <Input
                            ref={(el) => { inputRefs.current[m.id] = el; }}
                            type="text"
                            value={materialSearchQueries[m.id] ?? m.name}
                            onChange={(e) => handleMaterialSearchChange(m.id, e.target.value)}
                            onFocus={() => setOpenDropdowns(prev => ({ ...prev, [m.id]: true }))}
                            onBlur={() => {
                              setTimeout(() => setOpenDropdowns(prev => ({ ...prev, [m.id]: false })), 150);
                            }}
                            placeholder="搜索物料名称"
                            className="w-32 h-6 px-1.5 pr-5 text-xs border-blue-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                          />
                          <Search className="w-3 h-3 text-blue-400 -ml-4" />
                        </div>
                        {/* 下拉搜索结果 — fixed 定位突破 overflow 限制 */}
                        {openDropdowns[m.id] && (() => {
                          const results = getFilteredMaterials(m.id);
                          if (results.length === 0) return null;
                          const inputEl = inputRefs.current[m.id];
                          const rect = inputEl?.getBoundingClientRect();
                          return (
                            <div
                              className="fixed z-[999] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
                              style={{
                                top: rect ? rect.bottom + 2 : 0,
                                left: rect ? rect.left : 0,
                                minWidth: rect ? rect.width : 200,
                              }}
                            >
                              {results.map((wm) => (
                                <Button
                                  key={wm.id}
                                  type="button"
                                  variant="ghost"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectMaterial(m.id, wm);
                                  }}
                                  className="h-auto w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 flex items-center justify-between border-b border-gray-50 last:border-b-0"
                                >
                                  <span className="font-medium text-gray-800 truncate max-w-[140px]">{wm.name}</span>
                                  <span className="text-gray-400 font-mono text-[10px] ml-2 flex-shrink-0">{wm.code}</span>
                                </Button>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.category}
                          onChange={(e) => handleMaterialChange(m.id, 'category', e.target.value)}
                          className="w-20 h-6 px-1 text-xs border-gray-300 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.specification}
                          onChange={(e) => handleMaterialChange(m.id, 'specification', e.target.value)}
                          className="w-16 h-6 px-1 text-xs border-gray-300 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.barcode}
                          onChange={(e) => handleMaterialChange(m.id, 'barcode', e.target.value)}
                          className="w-20 h-6 px-1 text-xs border-gray-300 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.unit}
                          onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                          className="w-12 h-6 px-1 text-xs border-gray-300 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <NumberInput
                          value={m.quantity}
                          onChange={(val) => handleMaterialChange(m.id, 'quantity', Number(val))}
                          className="w-16 h-6 px-1 text-xs border-yellow-300 bg-yellow-50"
                          placeholder="数量"
                          decimals={0}
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.price}
                          onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                          className="w-16 h-6 px-1 text-xs border-gray-300 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.location}
                          onChange={(e) => handleMaterialChange(m.id, 'location', e.target.value)}
                          className="w-16 h-6 px-1 text-xs border-gray-300 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.batchNo}
                          onChange={(e) => handleMaterialChange(m.id, 'batchNo', e.target.value)}
                          className="w-20 h-6 px-1 text-xs border-yellow-300 bg-yellow-50"
                          placeholder="批号"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <DatePicker
                          selected={m.productionDate ? new Date(m.productionDate) : undefined}
                          onChange={(date) => handleMaterialChange(m.id, 'productionDate', date.toISOString().slice(0, 10))}
                          placeholder="生产日期"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <DatePicker
                          selected={m.expiryDate ? new Date(m.expiryDate) : undefined}
                          onChange={(date) => handleMaterialChange(m.id, 'expiryDate', date.toISOString().slice(0, 10))}
                          placeholder="有效期至"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.remarks}
                          onChange={(e) => handleMaterialChange(m.id, 'remarks', e.target.value)}
                          className="w-20 h-6 px-1 text-xs border-yellow-300 bg-yellow-50"
                          placeholder="备注"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

        {/* 缩放拖拽手柄（最大化时隐藏） */}
        {!isMaximized && (
          <>
            {/* 四角手柄 */}
            <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
            <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
            <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
            <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-emerald-400/40 rounded-sm z-10" onMouseDown={(e) => handleResizeStart(e, 'se')} />
            {/* 四边手柄 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 cursor-n-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleResizeStart(e, 'n')} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1.5 cursor-s-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleResizeStart(e, 's')} />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 cursor-w-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleResizeStart(e, 'w')} />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-12 cursor-e-resize hover:bg-emerald-400/40 rounded z-10" onMouseDown={(e) => handleResizeStart(e, 'e')} />
          </>
        )}
      </div>
    </div>
  );
};

export default InboundAddModal;
