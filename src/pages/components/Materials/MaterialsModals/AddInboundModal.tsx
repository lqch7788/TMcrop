/**
 * 新增入库弹窗组件
 */
import type { NewInboundForm, CategoryConfig } from '../../../types/materials.types';
import { Button } from '../../../../components/ui/button';

interface AddInboundModalProps {
  show: boolean;
  newInbound: NewInboundForm;
  codeError: string;
  nameError: string;
  onClose: () => void;
  onSave: () => void;
  onNewInboundChange: (field: string, value: string) => void;
  onGenerateOrderCode: () => void;
  onCheckCodeDuplicate: (code: string) => void;
  onCheckNameDuplicate: (name: string) => void;
}

// 简化的编码配置
const CATEGORY_CONFIG: CategoryConfig = {
  'SP': {
    name: '生产投入类',
    categories: {
      '01': { name: '种质资源', subCategories: { '01': { name: '粮食作物种子', prefix: 'SP0101' }, '02': { name: '经济作物种子', prefix: 'SP0102' }, '03': { name: '蔬菜种子', prefix: 'SP0103' } } },
      '02': { name: '肥料与土壤改良剂', subCategories: { '01': { name: '有机肥', prefix: 'SP0201' }, '02': { name: '化学肥料', prefix: 'SP0202' } } },
      '03': { name: '农药与植保产品', subCategories: { '01': { name: '杀虫剂', prefix: 'SP0301' }, '02': { name: '杀菌剂', prefix: 'SP0302' } } },
    },
  },
  'EQ': {
    name: '设施与装备类',
    categories: {
      '01': { name: '农业机械', subCategories: { '03': { name: '植保机械', prefix: 'EQ0103' } } },
      '03': { name: '灌溉与水肥系统', subCategories: { '06': { name: '灌溉终端', prefix: 'EQ0306' } } },
    },
  },
};

// 大类选项
const BIG_CATEGORIES = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
];

export default function AddInboundModal({
  show,
  newInbound,
  codeError,
  nameError,
  onClose,
  onSave,
  onNewInboundChange,
  onGenerateOrderCode,
}: AddInboundModalProps) {
  // 获取中类选项
  const getMidCategories = () => {
    if (!newInbound.bigCategory) return [];
    const bigCat = CATEGORY_CONFIG[newInbound.bigCategory as keyof CategoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取小类选项
  const getSubCategories = () => {
    if (!newInbound.bigCategory || !newInbound.midCategory) return [];
    const bigCat = CATEGORY_CONFIG[newInbound.bigCategory as keyof CategoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[newInbound.midCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
      prefix: data.prefix,
    }));
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            新增物料入库
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-4">
            {/* 入库单号 */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">入库单号</label>
                <input
                  type="text"
                  value={newInbound.orderCode}
                  readOnly
                  placeholder="点击生成按钮自动生成"
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-400 rounded-lg text-gray-600 text-sm"
                />
              </div>
              <Button variant="blue" onClick={onGenerateOrderCode} className="mt-6">
                生成单号
              </Button>
            </div>

            {/* 三级分类 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
                <select
                  value={newInbound.bigCategory}
                  onChange={(e) => onNewInboundChange('bigCategory', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm"
                >
                  <option value="">请选择</option>
                  {BIG_CATEGORIES.map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
                <select
                  value={newInbound.midCategory}
                  onChange={(e) => onNewInboundChange('midCategory', e.target.value)}
                  disabled={!newInbound.bigCategory}
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm disabled:opacity-50"
                >
                  <option value="">请选择</option>
                  {getMidCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
                <select
                  value={newInbound.subCategory}
                  onChange={(e) => onNewInboundChange('subCategory', e.target.value)}
                  disabled={!newInbound.midCategory}
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm disabled:opacity-50"
                >
                  <option value="">请选择</option>
                  {getSubCategories().map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 物料编码和名称 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">物料编码</label>
                <input
                  type="text"
                  value={newInbound.materialCode}
                  readOnly
                  placeholder="根据分类自动生成"
                  className={`w-full px-4 py-2 border rounded-lg text-gray-900 text-sm ${
                    codeError ? 'border-red-500 bg-red-50' : 'border-gray-400 bg-gray-100'
                  }`}
                />
                {codeError && <p className="text-red-500 text-xs mt-1">{codeError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
                <input
                  type="text"
                  value={newInbound.materialName}
                  onChange={(e) => onNewInboundChange('materialName', e.target.value)}
                  placeholder="输入物料名称"
                  className={`w-full px-4 py-2 border rounded-lg text-gray-900 text-sm ${
                    nameError ? 'border-red-500' : 'border-gray-400'
                  }`}
                />
                {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
              </div>
            </div>

            {/* 数量和单位 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                <input
                  type="text"
                  value={newInbound.quantity}
                  onChange={(e) => onNewInboundChange('quantity', e.target.value)}
                  placeholder="输入数量"
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                <select
                  value={newInbound.unit}
                  onChange={(e) => onNewInboundChange('unit', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm"
                >
                  <option value="袋">袋</option>
                  <option value="箱">箱</option>
                  <option value="台">台</option>
                  <option value="卷">卷</option>
                  <option value="个">个</option>
                  <option value="把">把</option>
                  <option value="双">双</option>
                  <option value="套">套</option>
                </select>
              </div>
            </div>

            {/* 供应商 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
              <input
                type="text"
                value={newInbound.supplier}
                onChange={(e) => onNewInboundChange('supplier', e.target.value)}
                placeholder="输入供应商名称"
                className="w-full px-4 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm"
              />
            </div>

            {/* 入库日期和操作员 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">入库日期</label>
                <input
                  type="date"
                  value={newInbound.inboundDate}
                  onChange={(e) => onNewInboundChange('inboundDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作员</label>
                <input
                  type="text"
                  value={newInbound.operator}
                  onChange={(e) => onNewInboundChange('operator', e.target.value)}
                  placeholder="输入操作员"
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm"
                />
              </div>
            </div>

            {/* 备注 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={newInbound.remarks}
                onChange={(e) => onNewInboundChange('remarks', e.target.value)}
                placeholder="输入备注信息"
                rows={3}
                className="w-full px-4 py-2 border border-gray-400 rounded-lg text-gray-900 text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="blue" onClick={onSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
