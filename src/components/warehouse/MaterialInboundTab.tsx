import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Hash, Search, Download, ChevronRight, ChevronDown, Eye, Edit, Trash2, RotateCcw, RotateCw } from 'lucide-react';
import { X } from 'lucide-react';
import { InboundExportModal, InboundBatchEditModal } from './InboundModals';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

export interface InboundMaterial {
  id: number;
  materialCode: string;
  materialName: string;
  category: string;
  bigCategory: string;
  midCategory: string;
  subCategory: string;
  specification: string;
  barcode: string;
  unit: string;
  quantity: number;
  price: string;
  supplier: string;
  location: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  remarks: string;
}

export interface InboundRecord {
  id: number;
  code: string;
  inboundDate: string;
  supplier: string;
  operator: string;
  status: 'completed' | 'pending' | 'voided';
  materials: InboundMaterial[];
  voidedDate?: string;
}

interface InboundFormData {
  orderCode: string;
  bigCategory: string;
  midCategory: string;
  subCategory: string;
  materialCode: string;
  materialName: string;
  category: string;
  specification: string;
  barcode: string;
  unit: string;
  quantity: string;
  price: string;
  supplier: string;
  location: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  inboundDate: string;
  operator: string;
  remarks: string;
}

interface CodeGenState {
  bigCategory: string;
  midCategory: string;
  subCategory: string;
  generatedCode: string;
}

const bigCategories = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
  { code: 'OP', name: '作业支持类' },
  { code: 'PH', name: '采后处理与流通类' },
  { code: 'IT', name: '数字化与管理类' },
  { code: 'EC', name: '能源与通用耗材' },
  { code: 'OT', name: '其他类' },
];

interface MaterialInboundTabProps {
  records: InboundRecord[];
  categoryConfig: Record<string, any>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewRecord: (record: InboundRecord) => void;
  onEditRecord: (record: InboundRecord) => void;
  onDeleteRecord: (record: InboundRecord) => void;
  onBatchDeleteRecords: (records: InboundRecord[]) => void;
  onBatchSaveRecord: (records: InboundRecord[]) => void;
  onAddRecord: () => void;
  // 权限控制 props
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

export function MaterialInboundTab({
  records,
  categoryConfig,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewRecord,
  onEditRecord,
  onBatchDeleteRecords,
  onBatchSaveRecord,
  onDeleteRecord,
  onAddRecord,
  // 权限控制 props - 默认为 true 以兼容无权限配置的情况
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
}: MaterialInboundTabProps) {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [newInbound, setNewInbound] = useState<InboundFormData>({
    orderCode: '',
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    materialCode: '',
    materialName: '',
    category: '',
    specification: '',
    barcode: '',
    unit: '袋',
    quantity: '',
    price: '',
    supplier: '',
    location: '',
    batchNo: '',
    productionDate: '',
    expiryDate: '',
    inboundDate: '',
    operator: '',
    remarks: '',
  });
  const [codeGen, setCodeGen] = useState<CodeGenState>({
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    generatedCode: '',
  });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [inboundSearchCode, setInboundSearchCode] = useState('');
  const [inboundSearchSupplier, setInboundSearchSupplier] = useState('');
  const [inboundSearchStatus, setInboundSearchStatus] = useState('');
  const [inboundSearchMaterialName, setInboundSearchMaterialName] = useState('');
  const [inboundSearchMaterialCode, setInboundSearchMaterialCode] = useState('');
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);

  const toggleExpandRow = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const getMidCategories = () => {
    if (!codeGen.bigCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]: [string, any]) => ({
      code,
      name: data.name,
    }));
  };

  const getSubCategories = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[codeGen.midCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]: [string, any]) => ({
      code,
      name: data.name,
      prefix: data.prefix,
    }));
  };

  const handleCodeGenCategoryChange = (field: string, value: string) => {
    if (field === 'bigCategory') {
      setCodeGen({ ...codeGen, bigCategory: value, midCategory: '', subCategory: '', generatedCode: '' });
    } else if (field === 'midCategory') {
      setCodeGen({ ...codeGen, midCategory: value, subCategory: '', generatedCode: '' });
    } else if (field === 'subCategory') {
      setCodeGen({ ...codeGen, subCategory: value, generatedCode: '' });
    }
    setCodeGenError('');
    setCodeGenSuccess('');
  };

  const handleCodeGen = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory || !codeGen.subCategory) {
      setCodeGenError('请先选择大类、中类、小类');
      return;
    }
    setCodeGenSuccess('编码已生成！');
    setCodeGen({ ...codeGen, generatedCode: 'SP0101001' });
  };

  const handleVerifyCode = () => {
    if (!codeGen.generatedCode) {
      setCodeGenError('请先生成编码');
      return;
    }
    setCodeGenSuccess('验证通过：该编码可以使用！');
  };

  const handleCopyCode = () => {
    if (!codeGen.generatedCode) return;
    navigator.clipboard.writeText(codeGen.generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleResetCodeGen = () => {
    setCodeGen({ bigCategory: '', midCategory: '', subCategory: '', generatedCode: '' });
    setCodeGenError('');
    setCodeGenSuccess('');
  };

  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const startIdx = (page - 1) * pageSize;

  // 入库记录搜索过滤
  const filteredRecords = records.filter(record => {
    // 入库单号搜索
    if (inboundSearchCode && !record.code.toLowerCase().includes(inboundSearchCode.toLowerCase())) {
      return false;
    }
    // 供应商搜索
    if (inboundSearchSupplier && !record.supplier.toLowerCase().includes(inboundSearchSupplier.toLowerCase())) {
      return false;
    }
    // 状态搜索
    if (inboundSearchStatus && record.status !== inboundSearchStatus) {
      return false;
    }
    // 物料名称或编码搜索（匹配任意物料明细）
    if (inboundSearchMaterialName || inboundSearchMaterialCode) {
      const hasMatch = record.materials.some(m => {
        const nameMatch = !inboundSearchMaterialName || (m.materialName && m.materialName.toLowerCase().includes(inboundSearchMaterialName.toLowerCase()));
        const codeMatch = !inboundSearchMaterialCode || (m.materialCode && m.materialCode.toLowerCase().includes(inboundSearchMaterialCode.toLowerCase()));
        return nameMatch && codeMatch;
      });
      if (!hasMatch) return false;
    }
    return true;
  });

  const displayedRecords = filteredRecords.slice(startIdx, startIdx + pageSize);

  const handleSelectAll = () => {
    if (deleteMode) {
      // 删除模式下只选择待审核的记录
      const pendingIds = displayedRecords.filter(r => r.status === 'pending').map(r => r.id);
      const allPendingSelected = pendingIds.every(id => selectedRows.includes(id));
      if (allPendingSelected) {
        setSelectedRows(selectedRows.filter(id => !pendingIds.includes(id)));
      } else {
        setSelectedRows([...selectedRows.filter(id => !pendingIds.includes(id)), ...pendingIds]);
      }
    } else {
      if (selectedRows.length === displayedRecords.length) {
        setSelectedRows([]);
      } else {
        setSelectedRows(displayedRecords.map(r => r.id));
      }
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(r => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleCancelSelection = () => {
    setEditMode(false);
    setDeleteMode(false);
    setExportMode(false);
    setShowBatchEditModal(false);
    setShowEditWarning(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    const selectedRecords = records.filter(r => selectedRows.includes(r.id));
    setShowExportModal(true);
  };

  const isAllSelected = deleteMode
    ? displayedRecords.filter(r => r.status === 'pending').every(r => selectedRows.includes(r.id))
    : displayedRecords.length > 0 && selectedRows.length === displayedRecords.length;

  const selectedRecords = records.filter(r => selectedRows.includes(r.id));

  const handleConfirmEdit = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要编辑的记录');
      return;
    }
    setShowEditWarning(true);
  };

  const handleProceedToEdit = () => {
    setShowEditWarning(false);
    if (selectedRows.length === 1) {
      const record = records.find(r => r.id === selectedRows[0]);
      if (record) {
        onEditRecord(record);
      }
      handleCancelSelection();
    } else {
      setShowBatchEditModal(true);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedRows.length > 0 && selectedRecords.length > 0) {
      onBatchDeleteRecords(selectedRecords);
    }
    handleCancelSelection();
  };

  return (
    <>
      {/* 入库记录搜索栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">入库单号</label>
              <Input
                type="text"
                value={inboundSearchCode}
                onChange={(e) => setInboundSearchCode(e.target.value)}
                placeholder="搜索单号"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
              <Input
                type="text"
                value={inboundSearchSupplier}
                onChange={(e) => setInboundSearchSupplier(e.target.value)}
                placeholder="搜索供应商"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <Select value={inboundSearchStatus} onValueChange={(val) => setInboundSearchStatus(val)}>
                <SelectTrigger className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="voided">已作废</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
              <Input
                type="text"
                value={inboundSearchMaterialName}
                onChange={(e) => setInboundSearchMaterialName(e.target.value)}
                placeholder="搜索物料名称"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">物料编码</label>
              <Input
                type="text"
                value={inboundSearchMaterialCode}
                onChange={(e) => setInboundSearchMaterialCode(e.target.value)}
                placeholder="搜索物料编码"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => {
                setInboundSearchCode('');
                setInboundSearchSupplier('');
                setInboundSearchStatus('');
                setInboundSearchMaterialName('');
                setInboundSearchMaterialCode('');
              }}>
              <RotateCw className="w-4 h-4" />
              重置
            </Button>
            <Button size="sm">
              <Search className="w-4 h-4" />
              搜索
            </Button>
          </div>
        </div>
      </div>

      {/* 入库记录表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">物料入库记录</h3>
            {(editMode || deleteMode || exportMode) && (
              <div className="flex items-center gap-2 ml-4">
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-emerald-600 hover:text-emerald-700 p-0 h-auto">
                  {isAllSelected ? '全不选' : '全选'}
                </Button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editMode && !deleteMode && !exportMode ? (
              <>
                {canEdit && (
                  <Button size="sm" variant="blue" onClick={() => setEditMode(true)}>
                    <Edit className="w-4 h-4" />
                    编辑
                  </Button>
                )}
                {canDelete && (
                  <Button size="sm" variant="destructive" onClick={() => setDeleteMode(true)}>
                    <Trash2 className="w-4 h-4" />
                    删除
                  </Button>
                )}
                {canExport && (
                  <Button size="sm" onClick={() => setExportMode(true)}>
                    <Download className="w-4 h-4" />
                    导出
                  </Button>
                )}
                {(canEdit || canDelete || canExport) && <div className="w-px h-6 bg-gray-300 mx-1"></div>}
                {canCreate && (
                  <Button size="sm" onClick={onAddRecord}>
                    <Plus className="w-4 h-4" />
                    新增入库
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* 编辑模式 */}
                {editMode && (
                  <>
                    <Button size="sm" variant="blue" onClick={handleConfirmEdit}>
                      确认编辑{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelSelection}>
                      取消
                    </Button>
                  </>
                )}
                {/* 删除模式 */}
                {deleteMode && (
                  <>
                    <Button size="sm" variant="destructive" onClick={handleConfirmDelete}>
                      确认删除{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelSelection}>
                      取消
                    </Button>
                  </>
                )}
                {/* 导出模式 */}
                {exportMode && (
                  <>
                    <Button size="sm" onClick={handleConfirmExport}>
                      <Download className="w-4 h-4" />
                      确认导出{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelSelection}>
                      取消选择
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(editMode || deleteMode || exportMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <Input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-10"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作员</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料数量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {displayedRecords.map((record) => (
                <>
                  <tr key={record.id} className="hover:bg-blue-100 transition-colors">
                    {(editMode || deleteMode || exportMode) && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {deleteMode && record.status !== 'pending' ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          <Input
                            type="checkbox"
                            checked={selectedRows.includes(record.id)}
                            onChange={() => handleSelectRow(record.id)}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" onClick={() => toggleExpandRow(record.id)}>
                        {expandedRows.has(record.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => onViewRecord(record)}>
                      {record.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.inboundDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.supplier}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.operator}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.materials.length} 种物料</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'completed' ? 'bg-green-100 text-green-700' :
                        record.status === 'voided' ? 'bg-gray-100 text-gray-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {record.status === 'completed' ? '已完成' : record.status === 'voided' ? '已作废' : '待审核'}
                      </span>
                    </td>
                  </tr>
                  {expandedRows.has(record.id) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 bg-gray-50">
                        <div className="text-sm">
                          <p className="font-medium text-gray-700 mb-2">物料明细：</p>
                          <div className="overflow-x-auto rounded border">
                            <table className="w-full bg-white">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">物料编码</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">物料名称</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">分类</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">规格</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">条形码</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">单位</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">数量</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">单价</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">供应商</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">存放位置</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">批号</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">生产日期</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">有效期至</th>
                                  <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">备注</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.materials.map((m) => (
                                  <tr key={m.id} className="border-t">
                                    <td className="px-2 py-2 text-xs text-blue-600 whitespace-nowrap">{m.materialCode}</td>
                                    <td className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{m.materialName}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.category}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.specification}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.barcode}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.unit}</td>
                                    <td className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{m.quantity}</td>
                                    <td className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{m.price}元</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.supplier}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.location}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.batchNo}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.productionDate}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.expiryDate}</td>
                                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.remarks}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <Select value={String(pageSize)} onValueChange={(val) => { onPageSizeChange(Number(val)); onPageChange(1); }}>
              <SelectTrigger className="h-8 px-2 py-1 border border-gray-200 rounded text-sm">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {records.length} 条</span>
            <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <InboundBatchEditModal
        records={selectedRecords}
        isOpen={showBatchEditModal}
        onClose={() => setShowBatchEditModal(false)}
        onSave={onBatchSaveRecord}
      />

      <InboundExportModal
        records={selectedRecords}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {showEditWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.402-1.333-3.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">批量编辑入库记录风险提示</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mb-6">
              <p>编辑入库记录后可能存在以下风险：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>入库记录关联的库存数据可能发生变化</li>
                <li>修改物料明细可能影响成本统计</li>
                <li>已审核的记录修改后需要重新审核</li>
              </ul>
              <p className="font-medium text-gray-700">请谨慎操作，确认要进行批量编辑吗？</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowEditWarning(false)} className="flex-1">
                取消
              </Button>
              <Button variant="blue" onClick={handleProceedToEdit} className="flex-1">
                已知晓
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
