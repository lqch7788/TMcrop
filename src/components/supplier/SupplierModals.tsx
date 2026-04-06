import { X, AlertTriangle } from 'lucide-react';
import { Supplier, NewSupplierForm, EditSupplierForm } from './types';
import { supplierCategories, supplierTypeOptions, supplierAttributeOptions, supplierStatusOptions, getSupplierTypeName } from './data';

interface ExportModalProps {
  isOpen: boolean;
  selectedCount: number;
  exportFormat: string;
  onFormatChange: (format: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function ExportModal({ isOpen, selectedCount, exportFormat, onFormatChange, onConfirm, onCancel, onClose }: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">閫夋嫨瀵煎嚭鏍煎紡</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">宸查€夋嫨 {selectedCount} 鏉℃暟鎹?/p>
            <div className="space-y-3">
              {[
                { value: 'excel', label: 'Excel (.xlsx)', desc: '閫傜敤浜庢暟鎹垎鏋? },
                { value: 'csv', label: 'CSV (.csv)', desc: '閫傜敤浜庢暟鎹氦鎹? },
                { value: 'word', label: 'Word (.docx)', desc: '閫傜敤浜庢枃妗ｇ紪杈? },
              ].map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    exportFormat === format.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => onFormatChange(e.target.value)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{format.label}</p>
                    <p className="text-xs text-gray-500">{format.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onCancel} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
              鍙栨秷
            </button>
            <button onClick={onConfirm} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              瀵煎嚭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SupplierAddModalProps {
  isOpen: boolean;
  newSupplier: NewSupplierForm;
  generatedCode: string;
  onChange: (supplier: NewSupplierForm) => void;
  onCopyCode: (code: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function SupplierAddModal({ isOpen, newSupplier, generatedCode, onChange, onCopyCode, onSave, onClose }: SupplierAddModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600">
            <h2 className="text-lg font-semibold text-white">鏂板</h2>
            <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鎵€灞炵粍缁?/label>
                <select
                  value={newSupplier.organization}
                  onChange={(e) => onChange({...newSupplier, organization: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">璇烽€夋嫨</option>
                  <option value="瀹佹尝甯府蹇欏叕鍙?>瀹佹尝甯府蹇欏叕鍙?/option>
                  <option value="鎴愰兘甯府鎮ㄥ叕鍙?>鎴愰兘甯府鎮ㄥ叕鍙?/option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渚涘簲鍟嗙紪鐮?/label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSupplier.code}
                    onChange={(e) => onChange({...newSupplier, code: e.target.value})}
                    placeholder="浠庣紪鐮佺敓鎴愬櫒澶嶅埗鎴栨墜鍔ㄨ緭鍏?
                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => onCopyCode(generatedCode)}
                    disabled={!generatedCode}
                    className="px-3 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    澶嶅埗缂栫爜
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渚涘簲鍟嗗悕绉?span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => onChange({...newSupplier, name: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渚涘簲鍟嗙被鍨?/label>
                <select
                  value={newSupplier.supplierType}
                  onChange={(e) => onChange({...newSupplier, supplierType: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">璇烽€夋嫨</option>
                  {supplierTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渚涘簲鍟嗗睘鎬?/label>
                <select
                  value={newSupplier.supplierAttribute}
                  onChange={(e) => onChange({...newSupplier, supplierAttribute: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">璇烽€夋嫨</option>
                  {supplierAttributeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鑱旂郴浜?/label>
                <input
                  type="text"
                  value={newSupplier.contact}
                  onChange={(e) => onChange({...newSupplier, contact: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">绉诲姩鐢佃瘽</label>
                <input
                  type="text"
                  value={newSupplier.mobilePhone}
                  onChange={(e) => onChange({...newSupplier, mobilePhone: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">宸ヤ綔鐢佃瘽</label>
                <input
                  type="text"
                  value={newSupplier.workPhone}
                  onChange={(e) => onChange({...newSupplier, workPhone: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">浼犵湡鍙风爜</label>
                <input
                  type="text"
                  value={newSupplier.fax}
                  onChange={(e) => onChange({...newSupplier, fax: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鍥藉</label>
                <select
                  value={newSupplier.country}
                  onChange={(e) => onChange({...newSupplier, country: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="涓浗">涓浗</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鐪佷唤</label>
                <input
                  type="text"
                  value={newSupplier.province}
                  onChange={(e) => onChange({...newSupplier, province: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鍩庡競</label>
                <input
                  type="text"
                  value={newSupplier.city}
                  onChange={(e) => onChange({...newSupplier, city: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">璇︾粏鍦板潃</label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => onChange({...newSupplier, address: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鐘舵€?/label>
                <select
                  value={newSupplier.status || '鍚堜綔涓?}
                  onChange={(e) => onChange({...newSupplier, status: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  {supplierStatusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">寮€鎴疯</label>
                <input
                  type="text"
                  value={newSupplier.bankName}
                  onChange={(e) => onChange({...newSupplier, bankName: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">閾惰鍗″彿</label>
                <input
                  type="text"
                  value={newSupplier.bankCardNumber}
                  onChange={(e) => onChange({...newSupplier, bankCardNumber: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鍒涘缓鏃堕棿</label>
                <input
                  type="date"
                  value={newSupplier.createDate}
                  onChange={(e) => onChange({...newSupplier, createDate: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">澶囨敞</label>
                <input
                  type="text"
                  value={newSupplier.remarks}
                  onChange={(e) => onChange({...newSupplier, remarks: e.target.value})}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
              鍙栨秷
            </button>
            <button onClick={onSave} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              淇濆瓨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SupplierDetailModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
}

export function SupplierDetailModal({ isOpen, supplier, onClose }: SupplierDetailModalProps) {
  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600">
            <h2 className="text-lg font-semibold text-white">渚涘簲鍟嗚鎯?/h2>
            <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">渚涘簲鍟嗙紪鐮?/label>
                <p className="text-sm font-medium text-gray-900">{supplier.code}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">渚涘簲鍟嗗悕绉?/label>
                <p className="text-sm font-medium text-gray-900">{supplier.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">渚涘簲鍟嗙被鍨?/label>
                <p className="text-sm font-medium text-gray-900">{getSupplierTypeName(supplier.supplierType)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">渚涘簲鍟嗗睘鎬?/label>
                <p className="text-sm font-medium text-gray-900">{supplier.supplierAttribute}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">鎵€灞炵粍缁?/label>
                <p className="text-sm font-medium text-gray-900">{supplier.organization}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">鑱旂郴浜?/label>
                <p className="text-sm font-medium text-gray-900">{supplier.contact}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">绉诲姩鐢佃瘽</label>
                <p className="text-sm font-medium text-gray-900">{supplier.mobilePhone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">宸ヤ綔鐢佃瘽</label>
                <p className="text-sm font-medium text-gray-900">{supplier.workPhone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">浼犵湡鍙风爜</label>
                <p className="text-sm font-medium text-gray-900">{supplier.fax || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">鍥藉</label>
                <p className="text-sm font-medium text-gray-900">{supplier.country}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">鐪佷唤</label>
                <p className="text-sm font-medium text-gray-900">{supplier.province || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">鍩庡競</label>
                <p className="text-sm font-medium text-gray-900">{supplier.city || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">璇︾粏鍦板潃</label>
                <p className="text-sm font-medium text-gray-900">{supplier.address || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">鐘舵€?/label>
                <p className="text-sm font-medium text-gray-900">{supplier.status}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">寮€鎴疯</label>
                <p className="text-sm font-medium text-gray-900">{supplier.bankName || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">閾惰鍗″彿</label>
                <p className="text-sm font-medium text-gray-900">{supplier.bankCardNumber || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">鍒涘缓鏃堕棿</label>
                <p className="text-sm font-medium text-gray-900">{supplier.createDate}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">澶囨敞</label>
                <p className="text-sm font-medium text-gray-900">{supplier.remarks || '-'}</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
              鍏抽棴
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WarningDialogProps {
  type: 'edit' | 'delete';
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WarningDialog({ type, isOpen, onConfirm, onCancel }: WarningDialogProps) {
  if (!isOpen) return null;

  const isEdit = type === 'edit';
  const title = isEdit ? '纭鎵归噺缂栬緫' : '纭鎵归噺鍒犻櫎';
  const message = isEdit 
    ? '鍗冲皢杩涘叆鎵归噺缂栬緫妯″紡锛屾偍鍙互鍦ㄧ紪杈戝畬鎴愬悗淇濆瓨鎵€鏈夋洿鏀广€傛槸鍚︾户缁紵' 
    : '纭畾瑕佸垹闄ら€変腑鐨勪緵搴斿晢鍚楋紵姝ゆ搷浣滀笉鍙挙閿€銆?;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEdit ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${isEdit ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onCancel} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
              鍙栨秷
            </button>
            <button onClick={onConfirm} className={`h-10 px-6 rounded-lg text-sm font-medium text-white ${isEdit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
              纭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SupplierEditWarningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SupplierEditWarningModal({ isOpen, onConfirm, onCancel }: SupplierEditWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">缂栬緫渚涘簲鍟?/h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              鍗冲皢杩涘叆缂栬緫妯″紡锛屾偍鍙互鍦ㄧ紪杈戝畬鎴愬悗淇濆瓨鎵€鏈夋洿鏀广€傛槸鍚︾户缁紵
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                鎻愮ず锛氱紪杈戞ā寮忎笅鍙嬀閫夊涓緵搴斿晢杩涜鎵归噺缂栬緫锛屾垨鐩存帴缂栬緫鍗曚釜渚涘簲鍟嗐€?              </p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onCancel} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
              鍙栨秷
            </button>
            <button onClick={onConfirm} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              宸茬煡鏅?            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SupplierEditModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  editForm: EditSupplierForm;
  onFormChange: (form: EditSupplierForm) => void;
  onSave: () => void;
  onClose: () => void;
}

export function SupplierEditModal({ isOpen, supplier, editForm, onFormChange, onSave, onClose }: SupplierEditModalProps) {
  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600">
            <h2 className="text-lg font-semibold text-white">缂栬緫渚涘簲鍟?/h2>
            <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渚涘簲鍟嗙紪鐮?/label>
                <input type="text" value={editForm.code} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渚涘簲鍟嗗悕绉?/label>
                <input type="text" value={editForm.name} onChange={(e) => onFormChange({...editForm, name: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鑱旂郴浜?/label>
                <input type="text" value={editForm.contact} onChange={(e) => onFormChange({...editForm, contact: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">绉诲姩鐢佃瘽</label>
                <input type="text" value={editForm.mobilePhone} onChange={(e) => onFormChange({...editForm, mobilePhone: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鐘舵€?/label>
                <select value={editForm.status} onChange={(e) => onFormChange({...editForm, status: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                  {supplierStatusOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">澶囨敞</label>
                <input type="text" value={editForm.remarks} onChange={(e) => onFormChange({...editForm, remarks: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">鍙栨秷</button>
            <button onClick={onSave} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">淇濆瓨纭</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SupplierEditConfirmModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  editForm: EditSupplierForm;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function SupplierEditConfirmModal({ isOpen, supplier, editForm, onConfirm, onCancel, onClose }: SupplierEditConfirmModalProps) {
  if (!isOpen || !supplier) return null;
  const changedFields = Object.entries(editForm).filter(([key, value]) => {
    if (key === 'lastEditBy' || key === 'lastEditTime') return false;
    return value !== (supplier as any)[key];
  });
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">纭缂栬緫</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">纭畾瑕佷繚瀛樹互涓嬫洿鏀瑰悧锛?/p>
            {changedFields.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {changedFields.slice(0, 5).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-500">{key}:</span>
                    <span className="text-gray-900 font-medium">{String(value)}</span>
                  </div>
                ))}
                {changedFields.length > 5 && (<p className="text-sm text-gray-500">...杩樻湁 {changedFields.length - 5} 椤规洿鏀?/p>)}
              </div>
            ) : (<p className="text-sm text-gray-500">娌℃湁妫€娴嬪埌鏇存敼</p>)}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onCancel} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">鍙栨秷</button>
            <button onClick={onConfirm} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">纭淇濆瓨</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SupplierDeleteConfirmModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function SupplierDeleteConfirmModal({ isOpen, supplier, onConfirm, onCancel, onClose }: SupplierDeleteConfirmModalProps) {
  if (!isOpen || !supplier) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">纭鍒犻櫎</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">纭畾瑕佸垹闄や互涓嬩緵搴斿晢鍚楋紵</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">{supplier.name}</p>
              <p className="text-xs text-gray-500">{supplier.code}</p>
            </div>
            <p className="text-sm text-red-500 mt-2">姝ゆ搷浣滀笉鍙挙閿€</p>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onCancel} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">鍙栨秷</button>
            <button onClick={onConfirm} className="h-10 px-6 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">纭鍒犻櫎</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SupplierBatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  currentBatchEditIndex: number;
  batchEditedSuppliers: Record<number, any>;
  suppliers: Supplier[];
  onBatchEditChange: (suppliers: Record<number, any>) => void;
  onCurrentIndexChange: (index: number) => void;
  onSaveNext: () => void;
  onSaveAll: () => void;
  onClose: () => void;
}

export function SupplierBatchEditModal({ isOpen, selectedRows, currentBatchEditIndex, batchEditedSuppliers, suppliers, onBatchEditChange, onCurrentIndexChange, onSaveNext, onSaveAll, onClose }: SupplierBatchEditModalProps) {
  if (!isOpen) return null;
  const currentSupplier = suppliers.find(s => s.id === selectedRows[currentBatchEditIndex]);
  const currentEdit = batchEditedSuppliers[selectedRows[currentBatchEditIndex]] || currentSupplier || {};
  const progress = `${currentBatchEditIndex + 1} / ${selectedRows.length}`;
  if (!currentSupplier) return null;
  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...batchEditedSuppliers, [selectedRows[currentBatchEditIndex]]: { ...currentEdit, [field]: value } };
    onBatchEditChange(updated);
  };
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600">
            <div>
              <h2 className="text-lg font-semibold text-white">鎵归噺缂栬緫渚涘簲鍟?/h2>
              <p className="text-sm text-emerald-100">姝ｅ湪缂栬緫绗?{progress}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">选择供应商</label>
              <select
                value={selectedRows[currentBatchEditIndex] || ''}
                onChange={(e) => {
                  const newIndex = selectedRows.findIndex(id => id === Number(e.target.value));
                  if (newIndex !== -1) onCurrentIndexChange(newIndex);
                }}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                {selectedRows.map((id) => {
                  const supplier = suppliers.find(s => s.id === id);
                  return (
                    <option key={id} value={id}>
                      {supplier?.name || `供应商${id}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渚涘簲鍟嗗悕绉?/label>
                <input type="text" value={currentEdit.name || ''} onChange={(e) => handleFieldChange('name', e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鑱旂郴浜?/label>
                <input type="text" value={currentEdit.contact || ''} onChange={(e) => handleFieldChange('contact', e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">绉诲姩鐢佃瘽</label>
                <input type="text" value={currentEdit.mobilePhone || ''} onChange={(e) => handleFieldChange('mobilePhone', e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">鐘舵€?/label>
                <select value={currentEdit.status || ''} onChange={(e) => handleFieldChange('status', e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">璇烽€夋嫨</option>
                  {supplierStatusOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">澶囨敞</label>
                <input type="text" value={currentEdit.remarks || ''} onChange={(e) => handleFieldChange('remarks', e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
            <button onClick={onClose} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">鍏抽棴</button>
            <div className="flex gap-3">
              {currentBatchEditIndex < selectedRows.length - 1 ? (
                <button onClick={onSaveNext} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">淇濆瓨骞朵笅涓€涓?/button>
              ) : (
                <button onClick={onSaveAll} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">淇濆瓨鍏ㄩ儴</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SupplierBatchDeleteConfirmModalProps {
  isOpen: boolean;
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function SupplierBatchDeleteConfirmModal({ isOpen, selectedCount, onConfirm, onCancel, onClose }: SupplierBatchDeleteConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">纭鎵归噺鍒犻櫎</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">纭畾瑕佸垹闄ら€変腑鐨?{selectedCount} 涓緵搴斿晢鍚楋紵</p>
            <p className="text-sm text-red-500">姝ゆ搷浣滀笉鍙挙閿€</p>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onCancel} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">鍙栨秷</button>
            <button onClick={onConfirm} className="h-10 px-6 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">纭鍒犻櫎</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SupplierEditSelectModalProps {
  isOpen: boolean;
  suppliers: Supplier[];
  selectedSuppliers: number[];
  onSupplierToggle: (id: number) => void;
  onSelectAll: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function SupplierEditSelectModal({ isOpen, suppliers, selectedSuppliers, onSupplierToggle, onSelectAll, onConfirm, onCancel, onClose }: SupplierEditSelectModalProps) {
  if (!isOpen) return null;
  const allSelected = selectedSuppliers.length === suppliers.length;
  const someSelected = selectedSuppliers.length > 0;
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600">
            <h2 className="text-lg font-semibold text-white">閫夋嫨瑕佺紪杈戠殑渚涘簲鍟?/h2>
            <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="mb-4 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={onSelectAll} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                <span className="text-sm font-medium text-gray-700">{allSelected ? '鍙栨秷鍏ㄩ€? : '鍏ㄩ€?}</span>
              </label>
              <span className="text-sm text-gray-500">宸查€夋嫨 {selectedSuppliers.length} / {suppliers.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suppliers.map((supplier) => {
                const isSelected = selectedSuppliers.includes(supplier.id);
                return (
                  <div key={supplier.id} onClick={() => onSupplierToggle(supplier.id)} className={`p-4 border rounded-lg cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={isSelected} onChange={() => onSupplierToggle(supplier.id)} className="w-4 h-4 mt-1 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{supplier.name}</p>
                        <p className="text-xs text-gray-500">{supplier.code}</p>
                        <p className="text-xs text-gray-400 mt-1">{getSupplierTypeName(supplier.supplierType)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
            <button onClick={onCancel} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">鍙栨秷</button>
            <button onClick={onConfirm} disabled={!someSelected} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed">纭閫夋嫨 ({selectedSuppliers.length})</button>
          </div>
        </div>
      </div>
    </div>
  );
}
