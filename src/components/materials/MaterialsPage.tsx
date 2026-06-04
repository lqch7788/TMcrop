// 物料管理主页面组件
import { useState, useMemo } from 'react';
import { Plus, Download, X, Search, RefreshCw } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import MaterialsHeader from './MaterialsHeader';
import MaterialsFilters from './MaterialsFilters';
import MaterialsTable from './MaterialsTable';
import AddInboundModal from './AddInboundModal';
// 旧版组件，已不再使用，保留占位数据避免编译错误
const mockWarehouseMaterials: any[] = [];
const mockInboundRecords: any[] = [];
const categoryConfig: Record<string, any> = {};
const bigCategories: any[] = [];
import { NewInboundForm } from './types';

// 默认的新增表单
const defaultNewInbound: NewInboundForm = {
  orderCode: '',
  bigCategory: '',
  midCategory: '',
  subCategory: '',
  materialCode: '',
  materialName: '',
  quantity: '',
  unit: '袋',
  supplier: '',
  inboundDate: '',
  operator: '',
  remarks: '',
};

export default function MaterialsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inbound'>('overview');

  // 筛选状态
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('全部');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [searchBigCategory, setSearchBigCategory] = useState('');
  const [searchMidCategory, setSearchMidCategory] = useState('');
  const [searchSubCategory, setSearchSubCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundPageSize, setInboundPageSize] = useState(10);

  // 导出模式状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);

  // 新增入库弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInbound, setNewInbound] = useState<NewInboundForm>(defaultNewInbound);
  const [codeError, setCodeError] = useState('');
  const [nameError, setNameError] = useState('');

  // 编码生成器状态
  const [codeGen, setCodeGen] = useState({
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    generatedCode: '',
  });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 入库记录数据
  const [inboundRecords] = useState(mockInboundRecords);

  // 计算低库存数量
  const lowStockCount = useMemo(() => {
    return mockWarehouseMaterials.filter((m) => m.quantity < m.minStock).length;
  }, []);

  // 筛选物料
  const filteredMaterials = useMemo(() => {
    return mockWarehouseMaterials.filter((m) => {
      if (code && !m.code.includes(code)) return false;
      if (name && !m.name.includes(name)) return false;
      if (supplier && m.supplier !== supplier) return false;
      if (location && m.location !== location) return false;
      if (searchBigCategory && !m.code.startsWith(searchBigCategory)) return false;
      if (searchMidCategory && !m.code.slice(2, 4).startsWith(searchMidCategory)) return false;
      if (searchSubCategory && !m.code.slice(4, 6).startsWith(searchSubCategory)) return false;
      if (showLowStock && m.quantity >= m.minStock) return false;
      return true;
    });
  }, [code, name, supplier, location, searchBigCategory, searchMidCategory, searchSubCategory, showLowStock]);

  // 重置筛选
  const handleReset = () => {
    setCode('');
    setName('');
    setCategory('全部');
    setSupplier('');
    setLocation('');
    setSearchBigCategory('');
    setSearchMidCategory('');
    setSearchSubCategory('');
    setShowLowStock(false);
    setCurrentPage(1);
  };

  // 低库存按钮点击
  const handleLowStockClick = () => {
    setShowLowStock(!showLowStock);
    setCurrentPage(1);
  };

  // 导出相关
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredMaterials.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredMaterials.map((m) => m.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleConfirmExport = () => {
    setShowExportModal(true);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleDoExport = async () => {
    const selectedData = filteredMaterials.filter((m) => selectedRows.includes(m.id));
    const exportData = selectedData.map((m) => ({
      '物料编号': m.code,
      '物料名称': m.name,
      '分类': m.category,
      '单位': m.unit,
      '库存数量': m.quantity,
      '最低库存': m.minStock,
      '单价': m.price,
      '供应商': m.supplier,
      '存放位置': m.location,
    }));

    const headers = ['物料编号', '物料名称', '分类', '单位', '库存数量', '最低库存', '单价', '供应商', '存放位置'];

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      const csvContent = [
        headers.join(','),
        ...exportData.map((row) => headers.map((h) => `"${row[h as keyof typeof row]}"`).join(',')),
      ].join('\n');
      const BOM = '\uFEFF';
      content = BOM + csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${exportData.map((row) => `<tr>${headers.map((h) => `<td>${row[h as keyof typeof row]}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>物料库存</title></head><body><table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse"><tr style="background-color:#f0f0f0">${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${exportData.map((row) => `<tr>${headers.map((h) => `<td>${row[h as keyof typeof row]}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `物料库存_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: exportFormat.toUpperCase() + ' Files',
              accept: { [mimeType]: ['.' + extension] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 编码生成器
  const getCodeGenMidCategories = () => {
    if (!codeGen.bigCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  const getCodeGenSubCategories = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory) return [];
    const bigCat = categoryConfig[codeGen.bigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[codeGen.midCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
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

    const subCat = getCodeGenSubCategories().find((s) => s.code === codeGen.subCategory);
    if (!subCat) return;

    const prefix = subCat.prefix;
    const existingCodes = mockWarehouseMaterials.filter((m) => m.code.startsWith(prefix)).map((m) => parseInt(m.code.slice(-3)));

    let maxSeq = 0;
    if (existingCodes.length > 0) {
      maxSeq = Math.max(...existingCodes);
    }

    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const fullCode = prefix + newSeq;

    setCodeGen({ ...codeGen, generatedCode: fullCode });
    setCodeGenError('');
    setCodeGenSuccess('编码已生成！');
  };

  const handleVerifyCode = () => {
    if (!codeGen.generatedCode) {
      setCodeGenError('请先生成编码');
      return;
    }

    const exists = mockWarehouseMaterials.some((m) => m.code === codeGen.generatedCode);
    if (exists) {
      setCodeGenError('警告：该编码已在库存中存在！');
      setCodeGenSuccess('');
    } else {
      setCodeGenError('');
      setCodeGenSuccess('验证通过：该编码可以使用！');
    }
  };

  const handleCopyCode = () => {
    if (!codeGen.generatedCode) return;
    navigator.clipboard.writeText(codeGen.generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // 新增入库相关
  const handleNewInboundChange = (field: string, value: string) => {
    setNewInbound({ ...newInbound, [field]: value });
  };

  const generateOrderCode = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const todayRecords = inboundRecords.filter((r) => r.code.startsWith(`RK${dateStr}`));
    let maxSeq = 0;
    if (todayRecords.length > 0) {
      const sequences = todayRecords.map((r) => parseInt(r.code.split('-')[1] || '0'));
      maxSeq = Math.max(...sequences);
    }
    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    const orderCode = `RK${dateStr}-${newSeq}`;
    setNewInbound({ ...newInbound, orderCode });
  };

  const checkCodeDuplicate = (code: string) => {
    if (!code) return;
    const exists = mockWarehouseMaterials.some((m) => m.code === code);
    if (exists) {
      setCodeError('该物料编码已存在，请重新选择分类');
    } else {
      setCodeError('');
    }
  };

  const checkNameDuplicate = (name: string) => {
    if (!name) return;
    const exists = mockWarehouseMaterials.some((m) => m.name === name);
    if (exists) {
      setNameError('该物料名称已存在');
    } else {
      setNameError('');
    }
  };

  const handleSaveInbound = () => {
    if (codeError || nameError) return;
    if (!newInbound.materialCode || !newInbound.materialName || !newInbound.quantity) return;

    // logger.info('Saving inbound:', newInbound);
    setShowAddModal(false);
    setNewInbound(defaultNewInbound);
    setCodeError('');
    setNameError('');
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setNewInbound(defaultNewInbound);
    setCodeError('');
    setNameError('');
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <MaterialsHeader
        lowStockCount={lowStockCount}
        showLowStock={showLowStock}
        onLowStockClick={handleLowStockClick}
      />

      {/* Tab切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActiveTab('overview');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          物料库存
        </button>
        <button
          onClick={() => {
            setActiveTab('inbound');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'inbound'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          物料入库
        </button>
      </div>

      {/* 物料库存 */}
      {activeTab === 'overview' && (
        <>
          {/* 筛选器 */}
          <MaterialsFilters
            code={code}
            name={name}
            category={category}
            supplier={supplier}
            location={location}
            searchBigCategory={searchBigCategory}
            searchMidCategory={searchMidCategory}
            searchSubCategory={searchSubCategory}
            showLowStock={showLowStock}
            warehouseMaterials={mockWarehouseMaterials}
            onCodeChange={setCode}
            onNameChange={setName}
            onCategoryChange={setCategory}
            onSupplierChange={setSupplier}
            onLocationChange={setLocation}
            onSearchBigCategoryChange={setSearchBigCategory}
            onSearchMidCategoryChange={setSearchMidCategory}
            onSearchSubCategoryChange={setSearchSubCategory}
            onShowLowStockChange={setShowLowStock}
            onReset={handleReset}
          />

          {/* 工具栏 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">物料库存列表</h3>
              <div className="flex items-center gap-2">
                {showLowStock && (
                  <button
                    onClick={handleLowStockClick}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <span>显示全部</span>
                  </button>
                )}
                {exportMode ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmExport}
                      className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      确认导出
                    </button>
                    <button
                      onClick={handleCancelExport}
                      className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleExportClick}
                    className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    导出
                  </button>
                )}
              </div>
            </div>

            {/* 表格 */}
            <MaterialsTable
              filteredMaterials={filteredMaterials}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              exportMode={exportMode}
              selectedRows={selectedRows}
              onSelectAll={handleSelectAll}
              onSelectRow={handleSelectRow}
            />
          </div>
        </>
      )}

      {/* 物料入库 */}
      {activeTab === 'inbound' && (
        <>
          {/* 编码规则生成器 */}
          <div className="bg-white rounded-xl p-6 shadow-none mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">物料编码生成</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                资材编码规则：大类(2位) + 中类(2位) + 小类(2位) + 序号(3位)
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
                <select
                  value={codeGen.bigCategory}
                  onChange={(e) => handleCodeGenCategoryChange('bigCategory', e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">请选择大类</option>
                  {bigCategories.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.code} - {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
                <select
                  value={codeGen.midCategory}
                  onChange={(e) => handleCodeGenCategoryChange('midCategory', e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  disabled={!codeGen.bigCategory}
                >
                  <option value="">请选择中类</option>
                  {getCodeGenMidCategories().map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.code} - {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
                <select
                  value={codeGen.subCategory}
                  onChange={(e) => handleCodeGenCategoryChange('subCategory', e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  disabled={!codeGen.midCategory}
                >
                  <option value="">请选择小类</option>
                  {getCodeGenSubCategories().map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.code} - {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">生成编码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codeGen.generatedCode}
                    placeholder="点击生成"
                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
                    readOnly
                  />
                  <button
                    onClick={handleCodeGen}
                    disabled={!codeGen.subCategory}
                    className="px-3 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    生成
                  </button>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleVerifyCode}
                disabled={!codeGen.generatedCode}
                className="px-4 h-9 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Search className="w-4 h-4" />
                验证重码
              </button>
              <button
                onClick={handleCopyCode}
                disabled={!codeGen.generatedCode}
                className="px-4 h-9 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                {copySuccess ? '已复制!' : '复制编码'}
              </button>
              <span className="text-xs text-gray-500">生成的编码可复制后用于新增物料</span>
            </div>

            {/* 提示信息 */}
            {codeGenError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{codeGenError}</p>
              </div>
            )}
            {codeGenSuccess && !codeGenError && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{codeGenSuccess}</p>
              </div>
            )}
          </div>

          {/* 入库记录表格 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">物料入库记录</h3>
              <button
                onClick={() => setShowAddModal(true)}
                className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> 新增入库
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库单号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料编号</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库数量</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">供应商</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">入库日期</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作员</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inboundRecords
                    .slice((inboundPage - 1) * inboundPageSize, inboundPage * inboundPageSize)
                    .map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.materialCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.materialName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {record.quantity}
                          {record.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.supplier}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.inboundDate}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.operator}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {record.status === 'completed' ? '已完成' : '待审核'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                              title="查看"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                            <button
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="编辑"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* 入库记录分页 */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">共 {inboundRecords.length} 条</div>
              <Pagination
                currentPage={inboundPage}
                totalPages={Math.ceil(inboundRecords.length / inboundPageSize) || 1}
                onPageChange={setInboundPage}
                pageSize={inboundPageSize}
                onPageSizeChange={(size) => { setInboundPageSize(size); setInboundPage(1); }}
                pageSizeOptions={[10, 20, 50]}
                showPageSize
              />
            </div>
          </div>
        </>
      )}

      {/* 新增入库弹窗 */}
      <AddInboundModal
        show={showAddModal}
        newInbound={newInbound}
        codeError={codeError}
        nameError={nameError}
        inboundRecords={inboundRecords}
        onClose={handleCloseModal}
        onSave={handleSaveInbound}
        onNewInboundChange={handleNewInboundChange}
        onGenerateOrderCode={generateOrderCode}
        onCheckCodeDuplicate={checkCodeDuplicate}
        onCheckNameDuplicate={checkNameDuplicate}
      />

      {/* 导出格式选择弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">已选择 {selectedRows.length} 条数据</p>
              <div className="space-y-3">
                {[
                  { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
                  { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
                  { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
                ].map((format) => (
                  <label
                    key={format.value}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      exportFormat === format.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format.value}
                      checked={exportFormat === format.value}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4 text-emerald-600 border-gray-400 focus:ring-emerald-500"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-900">{format.label}</span>
                      <span className="block text-xs text-gray-500">{format.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
              <button
                onClick={handleDoExport}
                disabled={selectedRows.length === 0}
                className="w-full mt-6 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
