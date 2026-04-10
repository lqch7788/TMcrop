// 新增入库弹窗组件
import { RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { NewInboundForm } from './types';
import { categoryConfig, warehouseMaterials, unitOptions } from './mockData';

interface AddInboundModalProps {
  show: boolean;
  newInbound: NewInboundForm;
  codeError: string;
  nameError: string;
  inboundRecords: Array<{
    id: number;
    code: string;
    materialCode: string;
    materialName: string;
    quantity: string;
    unit: string;
    supplier: string;
    inboundDate: string;
    operator: string;
    status: 'completed' | 'pending';
  }>;
  onClose: () => void;
  onSave: () => void;
  onNewInboundChange: (field: string, value: string) => void;
  onGenerateOrderCode: () => void;
  onCheckCodeDuplicate: (code: string) => void;
  onCheckNameDuplicate: (name: string) => void;
}

export default function AddInboundModal({
  show,
  newInbound,
  codeError,
  nameError,
  inboundRecords,
  onClose,
  onSave,
  onNewInboundChange,
  onGenerateOrderCode,
  onCheckCodeDuplicate,
  onCheckNameDuplicate,
}: AddInboundModalProps) {
  // 获取中类选项
  const getMidCategories = () => {
    if (!newInbound.bigCategory) return [];
    const bigCat = categoryConfig[newInbound.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取小类选项
  const getSubCategories = () => {
    if (!newInbound.bigCategory || !newInbound.midCategory) return [];
    const bigCat = categoryConfig[newInbound.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[newInbound.midCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
      prefix: data.prefix,
    }));
  };

  // 分类变化处理
  const handleCategoryChange = (field: string, value: string) => {
    if (field === 'bigCategory') {
      onNewInboundChange('bigCategory', value);
      onNewInboundChange('midCategory', '');
      onNewInboundChange('subCategory', '');
      onNewInboundChange('materialCode', '');
    } else if (field === 'midCategory') {
      onNewInboundChange('midCategory', value);
      onNewInboundChange('subCategory', '');
      onNewInboundChange('materialCode', '');
    } else if (field === 'subCategory') {
      onNewInboundChange('subCategory', value);
      onNewInboundChange('materialCode', '');
    }
  };

  // 生成编码
  const handleGenerateCode = () => {
    if (!newInbound.bigCategory || !newInbound.midCategory || !newInbound.subCategory) {
      onNewInboundChange('codeError', '请先选择大类、中类、小类');
      return;
    }

    const subCat = getSubCategories().find((s) => s.code === newInbound.subCategory);
    if (!subCat) return;

    const prefix = subCat.prefix;
    const existingCodes = warehouseMaterials
      .filter((m) => m.code.startsWith(prefix))
      .map((m) => parseInt(m.code.slice(-3)));

    let maxSeq = 0;
    if (existingCodes.length > 0) {
      maxSeq = Math.max(...existingCodes);
    }

    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const fullCode = prefix + newSeq;

    onNewInboundChange('materialCode', fullCode);
    onCheckCodeDuplicate(fullCode);
  };

  if (!show) return null;

  const handleClose = () => {
    onClose();
  };

  const isValid = !codeError && !nameError && newInbound.materialCode && newInbound.materialName && newInbound.quantity;

  return (
    <Modal
      isOpen={show}
      onClose={handleClose}
      title="新增入库"
      size="lg"
      showFooter={true}
      onSubmit={isValid ? onSave : undefined}
      submitText="保存"
      cancelText="取消"
    >
          {/* 入库单号 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">入库单号</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newInbound.orderCode}
                onChange={(e) => onNewInboundChange('orderCode', e.target.value)}
                placeholder="点击自动生成"
                className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-gray-50"
                readOnly
              />
              <button
                type="button"
                onClick={onGenerateOrderCode}
                className="px-4 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                自动生成
              </button>
            </div>
          </div>

          {/* 物料编码 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              物料编码 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newInbound.materialCode}
                onChange={(e) => {
                  onNewInboundChange('materialCode', e.target.value);
                  onCheckCodeDuplicate(e.target.value);
                }}
                placeholder="请输入物料编码（可从上方编码生成器复制）"
                className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleGenerateCode}
                className="px-4 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                生成编码
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">提示：可在"物料编码生成"区域生成并验证编码后复制到此</p>
            {codeError && <p className="text-xs text-red-500 mt-1">{codeError}</p>}
          </div>

          {/* 物料名称 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              物料名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newInbound.materialName}
              onChange={(e) => {
                onNewInboundChange('materialName', e.target.value);
                onCheckNameDuplicate(e.target.value);
              }}
              placeholder="请输入物料名称"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>

          {/* 分类选择 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
              <select
                value={newInbound.bigCategory}
                onChange={(e) => handleCategoryChange('bigCategory', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择大类</option>
                {Object.keys(categoryConfig).map((key) => (
                  <option key={key} value={key}>
                    {key} - {categoryConfig[key as keyof typeof categoryConfig].name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
              <select
                value={newInbound.midCategory}
                onChange={(e) => handleCategoryChange('midCategory', e.target.value)}
                disabled={!newInbound.bigCategory}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
              >
                <option value="">请选择中类</option>
                {getMidCategories().map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.code} - {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
              <select
                value={newInbound.subCategory}
                onChange={(e) => handleCategoryChange('subCategory', e.target.value)}
                disabled={!newInbound.midCategory}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
              >
                <option value="">请选择小类</option>
                {getSubCategories().map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.code} - {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 数量和单位 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                入库数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={newInbound.quantity}
                onChange={(e) => onNewInboundChange('quantity', e.target.value)}
                placeholder="请输入数量"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
              <select
                value={newInbound.unit}
                onChange={(e) => onNewInboundChange('unit', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 供应商 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
            <input
              type="text"
              value={newInbound.supplier}
              onChange={(e) => onNewInboundChange('supplier', e.target.value)}
              placeholder="请输入供应商"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 入库日期和操作员 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">入库日期</label>
              <input
                type="date"
                value={newInbound.inboundDate}
                onChange={(e) => onNewInboundChange('inboundDate', e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">操作员</label>
              <input
                type="text"
                value={newInbound.operator}
                onChange={(e) => onNewInboundChange('operator', e.target.value)}
                placeholder="请输入操作员"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={newInbound.remarks}
              onChange={(e) => onNewInboundChange('remarks', e.target.value)}
              placeholder="请输入备注"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
    </Modal>
  );
}
