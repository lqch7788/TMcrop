import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Hash, Search, Download, ChevronRight, ChevronDown, Eye, Edit, Edit2, Trash2, RotateCcw, RotateCw, X } from 'lucide-react';
import { InboundExportModal, InboundBatchEditModal } from './InboundModals';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

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
      showAlert('请先选择要编辑的记录');
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
              <Label className="block text-sm font-medium text-gray-700 mb-1">入库单号</Label>
              <Input
                type="text"
                value={inboundSearchCode}
                onChange={(e) => setInboundSearchCode(e.target.value)}
                placeholder="搜索单号"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">供应商</Label>
              <Input
                type="text"
                value={inboundSearchSupplier}
                onChange={(e) => setInboundSearchSupplier(e.target.value)}
                placeholder="搜索供应商"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
              <Select value={inboundSearchStatus} onValueChange={(val) => setInboundSearchStatus(val)}>
                <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
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
              <Label className="block text-sm font-medium text-gray-700 mb-1">物料名称</Label>
              <Input
                type="text"
                value={inboundSearchMaterialName}
                onChange={(e) => setInboundSearchMaterialName(e.target.value)}
                placeholder="搜索物料名称"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">物料编码</Label>
              <Input
                type="text"
                value={inboundSearchMaterialCode}
                onChange={(e) => setInboundSearchMaterialCode(e.target.value)}
                placeholder="搜索物料编码"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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
              <RotateCcw className="w-4 h-4" /> 重置
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
                    <Edit2 className="w-4 h-4" /> 编辑
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
                      <Edit2 className="w-4 h-4" /> 确认编辑{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelSelection}>
                      <X className="w-4 h-4" /> 取消
                    </Button>
                  </>
                )}
                {/* 删除模式 */}
                {deleteMode && (
                  <>
                    <Button size="sm" variant="destructive" onClick={handleConfirmDelete}>
                      <Trash2 className="w-4 h-4" /> 确认删除{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelSelection}>
                      <X className="w-4 h-4" /> 取消
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
                      <X className="w-4 h-4" /> 取消选择
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                {(editMode || deleteMode || exportMode) && (
                  <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                    />
                  </TableHead>
                )}
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-10"></TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库单号</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库日期</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作员</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料数量</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {displayedRecords.map((record) => (
                <>
                  <TableRow key={record.id} className="hover:bg-blue-100 transition-colors">
                    {(editMode || deleteMode || exportMode) && (
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        {deleteMode && record.status !== 'pending' ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          <Checkbox
                            checked={selectedRows.includes(record.id)}
                            onCheckedChange={() => handleSelectRow(record.id)}
                            className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3">
                      <Button variant="ghost" size="icon" onClick={() => toggleExpandRow(record.id)}>
                        {expandedRows.has(record.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => onViewRecord(record)}>
                      {record.code}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.inboundDate}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.supplier}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.operator}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.materials.length} 种物料</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'completed' ? 'bg-green-100 text-green-700' :
                        record.status === 'voided' ? 'bg-gray-100 text-gray-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {record.status === 'completed' ? '已完成' : record.status === 'voided' ? '已作废' : '待审核'}
                      </span>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(record.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-3 bg-gray-50">
                        <div className="text-sm">
                          <p className="font-medium text-gray-700 mb-2">物料明细：</p>
                          <div className="overflow-x-auto rounded border">
                            <Table className="w-full bg-white">
                              <TableHeader className="bg-gray-100">
                                <TableRow>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">物料编码</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">物料名称</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">分类</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">规格</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">条形码</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">单位</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">数量</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">单价</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">供应商</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">存放位置</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">批号</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">生产日期</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">有效期至</TableHead>
                                  <TableHead className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">备注</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {record.materials.map((m) => (
                                  <TableRow key={m.id} className="border-t">
                                    <TableCell className="px-2 py-2 text-xs text-blue-600 whitespace-nowrap">{m.materialCode}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{m.materialName}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.category}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.specification}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.barcode}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.unit}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{m.quantity}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{m.price}元</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.supplier}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.location}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.batchNo}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.productionDate}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.expiryDate}</TableCell>
                                    <TableCell className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{m.remarks}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={(size) => { onPageSizeChange(size); onPageChange(1); }}
            pageSizeOptions={[10, 20, 50]}
            showPageSize
          />
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

      <UnifiedModal
        isOpen={showEditWarning}
        onClose={() => setShowEditWarning(false)}
        title="批量编辑入库记录风险提示"
        size="sm"
        showFooter={true}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowEditWarning(false)} className="flex-1">
              <X className="w-4 h-4" /> 取消
            </Button>
            <Button variant="blue" onClick={handleProceedToEdit} className="flex-1">
              已知晓
            </Button>
          </div>
        }
      >
        <div className="text-sm text-gray-600 space-y-2">
          <p>编辑入库记录后可能存在以下风险：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>入库记录关联的库存数据可能发生变化</li>
            <li>修改物料明细可能影响成本统计</li>
            <li>已审核的记录修改后需要重新审核</li>
          </ul>
          <p className="font-medium text-gray-700">请谨慎操作，确认要进行批量编辑吗？</p>
        </div>
      </UnifiedModal>
    </>
  );
}
