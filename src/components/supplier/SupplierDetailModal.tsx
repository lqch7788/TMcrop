// 供应商详情弹窗组件
import { X } from 'lucide-react';
import { Supplier } from './types';
import { getSupplierTypeName } from './data';

interface SupplierDetailModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
}

export default function SupplierDetailModal({ isOpen, supplier, onClose }: SupplierDetailModalProps) {
  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b bg-emerald-600">
          <h3 className="text-lg font-semibold text-white">供应商详情</h3>
          <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-2 gap-6">
            {/* 基本信息 */}
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-gray-500 mb-3">基本信息</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">供应商编号</span>
                    <span className="text-sm font-medium text-gray-900">{supplier.code}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商名称</span>
                    <span className="text-sm font-medium text-gray-900">{supplier.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应类型</span>
                    <span className="text-sm text-gray-700">{getSupplierTypeName(supplier.supplierType)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">供应商属性</span>
                    <span className="text-sm text-gray-700">{supplier.supplierAttribute}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">所属组织</span>
                    <span className="text-sm text-gray-700">{supplier.organization}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">状态</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      supplier.status === '合作中' ? 'bg-green-100 text-green-700' :
                      supplier.status === '暂停' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {supplier.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 联系方式 */}
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-gray-500 mb-3">联系方式</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">联系人</span>
                    <span className="text-sm text-gray-900">{supplier.contact}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">移动电话</span>
                    <span className="text-sm text-gray-900">{supplier.mobilePhone}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">工作电话</span>
                    <span className="text-sm text-gray-700">{supplier.workPhone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">传真</span>
                    <span className="text-sm text-gray-700">{supplier.fax || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 地址信息 */}
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-gray-500 mb-3">地址信息</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs text-gray-500 block">国家/地区</span>
                  <span className="text-sm text-gray-900">{supplier.country}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">省份</span>
                    <span className="text-sm text-gray-900">{supplier.province}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">城市</span>
                    <span className="text-sm text-gray-900">{supplier.city}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">详细地址</span>
                  <span className="text-sm text-gray-900">{supplier.address}</span>
                </div>
              </div>
            </div>

            {/* 银行信息 */}
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-gray-500 mb-3">银行信息</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block">开户行</span>
                    <span className="text-sm text-gray-900">{supplier.bankName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">银行卡号</span>
                    <span className="text-sm text-gray-900">{supplier.bankCardNumber || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 其他信息 */}
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-gray-500 mb-3">其他信息</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-xs text-gray-500 block">创建时间</span>
                  <span className="text-sm text-gray-900">{supplier.createDate}</span>
                </div>
                {supplier.remarks && (
                  <div>
                    <span className="text-xs text-gray-500 block">备注</span>
                    <span className="text-sm text-gray-700">{supplier.remarks}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
