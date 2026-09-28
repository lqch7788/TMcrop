/**
 * 入库新增弹窗组件
 * 从 InboundModals 拆分出来，独立管理新增入库记录弹窗
 */

import React, { useState, useEffect } from 'react';
import { Plus, Send, Trash2, X } from 'lucide-react';
import { InboundRecord, InboundMaterial } from '../../../../types/warehouseInbound.types';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSupplierStore } from '@/stores/useSupplierStore';
import { MaterialAutocomplete } from '@/components/common/MaterialAutocomplete';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import type { Material } from '@/services/apiWarehouseMaterialService';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert } from '@/lib/dialogService';

interface InboundAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 返回 false 表示保存失败（父组件已提示）→ 保留弹窗与已填内容 */
  onSave: (record: Omit<InboundRecord, 'id'>) => void | Promise<unknown>;
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
  // 2026-09-28 审计修复：操作员此前取"用户列表第一个人"（users[0]），与实际登录人无关——
  // 实测入库单/库存流水的操作员全部记成「访客01」而登录人是陆启闯（审计链失真）。
  // 现在只认登录用户；登录态是异步恢复的，故用 effect 持续同步（输入框 readOnly，无需脏标记）。
  const authUser = useAuthStore((state) => state.currentUser);
  const currentUserName = authUser?.realName || authUser?.username || '';
  useEffect(() => {
    const name = authUser?.realName || authUser?.username;
    if (!name) return;
    setFormData((prev) => (prev.operator === name ? prev : { ...prev, operator: name }));
  }, [authUser]);
  // 获取当天日期字符串
  const today = todayLocal();

  // 供应商列表（从 Zustand Store 获取）
  const suppliers = useSupplierStore((s) => s.items);
  const loadSuppliers = useSupplierStore((s) => s.loadItems);

  // 弹窗打开时加载供应商列表（物料由 MaterialAutocomplete 内部按需加载）
  useEffect(() => {
    if (isOpen && suppliers.length === 0) loadSuppliers();
  }, [isOpen, suppliers.length, loadSuppliers]);

  // 选中下拉物料 → 自动填充基本信息（搜索状态/下拉开关由 MaterialAutocomplete 内部管理）
  const handleMaterialAutofill = (materialId: number, wm: Material) => {
    setMaterials(prev => prev.map(m => {
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
  };

  // 表单数据状态
  const [formData, setFormData] = useState({
    code: '',
    inboundDate: today,
    supplier: '',
    operator: currentUserName,
    // 2026-09-27：默认待审核（统一走"物料审批 → 物料入库"），直接入库仅限紧急场景
    status: 'pending' as 'completed' | 'pending',
  });

  // 物料列表状态
  const [materials, setMaterials] = useState<InboundMaterial[]>([]);

  // 编码错误状态
  const [codeError, setCodeError] = useState('');

  // 弹窗大小和位置状态
  const [isMaximized, setIsMaximized] = useState(false);
  // 2026-09-28：提交中标记（防重复提交）
  const [submitting, setSubmitting] = useState(false);
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
      const todayStr = todayLocal();
      const todayPrefix = `RK${todayStr.replace(/-/g, '')}-`;
      const seq = parseInt(newCode.replace(todayPrefix, ''), 10);
      const nextSeq = seq + 1;
      // 2026-09-27 修复：查重分支此前用 3 位序号（padStart(3)），与基础生成器 4 位不一致，
      // 同一天可能生成位数不同的单号；统一为 4 位、上限 9999
      if (nextSeq > 9999) {
        setCodeError('今日编号已达上限9999');
        return;
      }
      newCode = `${todayPrefix}${String(nextSeq).padStart(4, '0')}`;
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
      specification: '',
      barcode: '',
      unit: '袋',
      quantity: 0,
      // 2026-09-27：库存阈值（minStock/maxStock）属物料主数据，不在入库明细填写——
      // 由物料库存页的编辑/批量编辑维护（新物料入库后阈值为 0，库存页有"未设置"提示引导）
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
  // 2026-09-28 审计修复（P1）：
  // ① 提交前校验——此前"一条明细都不加""明细缺编码""数量为 0""手填重复单号"都能落库，
  //    空编码/0 数量明细会在后端入账时被静默跳过（单据显示已完成但库存没加）；
  // ② 防重复提交——此前按钮直连 onClick，快速双击会发两次 POST（后端单号无唯一约束）；
  // ③ 成功才清表单/关弹窗——此前无论成败都清空关闭，用户以为已提交。
  const handleSubmit = async () => {
    if (submitting) return;
    if (materials.length === 0) {
      await showAlert('请至少添加一条物料明细');
      return;
    }
    const badLines = materials
      .map((m, i) => ({ line: i + 1, code: String(m.code || '').trim(), qty: Number(m.quantity) || 0 }))
      .filter(x => !x.code || x.qty <= 0);
    if (badLines.length > 0) {
      await showAlert(`物料明细不合法：${badLines.map(x => `第 ${x.line} 行${!x.code ? '缺物料编码' : '数量必须大于 0'}`).join('；')}`);
      return;
    }
    const finalCode = formData.code || onGenerateCode();
    if (existingCodes.includes(finalCode)) {
      await showAlert(`入库单号 ${finalCode} 已存在，请重新生成或修改单号`);
      return;
    }

    setSubmitting(true);
    try {
      // 2026-09-27：明细继承单头供应商——入库新建物料时落主数据供应商（后端另有单头兜底）
      const materialsWithSupplier = materials.map(m => ({
        ...m,
        supplier: m.supplier || formData.supplier,
      }));
      // 2026-09-28 批次A-2：按名称从供应商主数据解析 id 一并落库
      // （名称仍是展示快照；id 用于供应商改名后不失真 / 按供应商统计）
      const matched = useSupplierStore.getState().items.find((s) => s.name === formData.supplier.trim());
      const result = await onSave({
        code: finalCode,
        inboundDate: formData.inboundDate,
        supplier: formData.supplier,
        supplierId: matched ? String(matched.id) : '',
        operator: formData.operator,
        status: formData.status,
        materials: materialsWithSupplier,
      });
      if (result === false) return; // 保存失败：父组件已提示，保留弹窗与已填内容供修正
      setFormData({
        code: '',
        inboundDate: today,
        supplier: '',
        operator: currentUserName,
        status: 'pending', // 与初始默认一致（统一走审批）
      });
      setMaterials([]);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // 如果弹窗未打开，不渲染任何内容
  if (!isOpen) return null;

  return (
    <div id="inbound-add-overlay" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        id="inbound-add-dialog"
        className="bg-white rounded-xl w-full max-w-6xl shadow-xl max-h-[90vh] flex flex-col relative"
      >
        {/* 标题栏（2026-09-28：内边距/无边框对齐 Modal 头部标准，保留自定义拖动与最大化能力） */}
        <div
          className="px-6 py-3 flex items-center justify-between bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 cursor-move rounded-t-xl"
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
            {/* 关闭按钮（样式对齐 Modal 头部关闭按钮） */}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-emerald-500">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 基本信息区域（内边距对齐 Modal 内容区标准） */}
        <div className="px-4 sm:px-6 py-4 bg-emerald-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* 入库单号 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">入库单号</Label>
              <div className="flex gap-1">
                <Input
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    setFormData({ ...formData, code: e.target.value });
                    setCodeError('');
                  }}
                  placeholder="点击生成"
                  className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <Label className="block text-sm font-medium text-gray-700 mb-1">入库日期</Label>
              <DatePicker
                selected={formData.inboundDate ? new Date(formData.inboundDate) : undefined}
                onChange={() => {}}
                placeholder="入库日期"
                disabled
              />
            </div>

            {/* 供应商（搜索+下拉，可重选） */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">供应商</Label>
              <SearchableSelect
                value={formData.supplier}
                onChange={(val) => setFormData({ ...formData, supplier: val })}
                options={suppliers.map((s) => ({ value: s.name, label: s.name }))}
                placeholder="搜索或选择供应商"
                allowClear
              />
            </div>

            {/* 操作员 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">操作员</Label>
              <Input
                type="text"
                value={formData.operator}
                readOnly
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* 状态：2026-09-27 改为默认待审核（统一走审批），"直接入库"仅限紧急场景 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val as 'completed' | 'pending' })}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待审核（审批通过后入库）</SelectItem>
                  <SelectItem value="completed">直接入库（跳过审批，紧急场景）</SelectItem>
                </SelectContent>
              </Select>
              {formData.status === 'completed' && (
                <p className="mt-1 text-[11px] text-amber-600">
                  ⚠ 直接入库将跳过审批、立即计入库存，仅限车辆等卸/急用等紧急场景
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 物料明细区域（内边距对齐 Modal 内容区标准） */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h4 className="text-sm font-semibold text-gray-800">物料明细（{materials.length}种物料）</h4>
              <span className="text-xs text-gray-400">|</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <span className="w-3 h-3 rounded border border-gray-400 bg-blue-50 inline-block"></span>
                自动关联
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <span className="w-3 h-3 rounded border border-gray-400 bg-yellow-50 inline-block"></span>
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
                          className="w-20 h-6 px-1 text-xs border-gray-400 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5">
                        <MaterialAutocomplete
                          value={m.name}
                          onChange={(v) => setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, name: v } : x))}
                          onSelect={(wm) => handleMaterialAutofill(m.id, wm)}
                          placeholder="搜索物料名称"
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.category}
                          onChange={(e) => handleMaterialChange(m.id, 'category', e.target.value)}
                          className="w-20 h-6 px-1 text-xs border-gray-400 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.specification}
                          onChange={(e) => handleMaterialChange(m.id, 'specification', e.target.value)}
                          className="w-16 h-6 px-1 text-xs border-gray-400 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.barcode}
                          onChange={(e) => handleMaterialChange(m.id, 'barcode', e.target.value)}
                          className="w-20 h-6 px-1 text-xs border-gray-400 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.unit}
                          onChange={(e) => handleMaterialChange(m.id, 'unit', e.target.value)}
                          className="w-12 h-6 px-1 text-xs border-gray-400 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <NumberInput
                          value={m.quantity}
                          onChange={(val) => handleMaterialChange(m.id, 'quantity', Number(val))}
                          className="w-16 h-6 px-1 text-xs border-gray-400 bg-yellow-50"
                          placeholder="数量"
                          decimals={0}
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.price}
                          onChange={(e) => handleMaterialChange(m.id, 'price', e.target.value)}
                          className="w-16 h-6 px-1 text-xs border-gray-400 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.location}
                          onChange={(e) => handleMaterialChange(m.id, 'location', e.target.value)}
                          className="w-16 h-6 px-1 text-xs border-gray-400 bg-blue-50"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.batchNo}
                          onChange={(e) => handleMaterialChange(m.id, 'batchNo', e.target.value)}
                          className="w-20 h-6 px-1 text-xs border-gray-400 bg-yellow-50"
                          placeholder="批号"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <DatePicker
                          selected={m.productionDate ? new Date(m.productionDate) : undefined}
                          onChange={(date) => handleMaterialChange(m.id, 'productionDate', todayLocal(date))}
                          placeholder="生产日期"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <DatePicker
                          selected={m.expiryDate ? new Date(m.expiryDate) : undefined}
                          onChange={(date) => handleMaterialChange(m.id, 'expiryDate', todayLocal(date))}
                          placeholder="有效期至"
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 whitespace-nowrap">
                        <Input
                          type="text"
                          value={m.remarks}
                          onChange={(e) => handleMaterialChange(m.id, 'remarks', e.target.value)}
                          className="w-20 h-6 px-1 text-xs border-gray-400 bg-yellow-50"
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

        {/* 底部按钮（样式对齐 Modal 底部栏标准） */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Send className="w-4 h-4" /> 提交
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
