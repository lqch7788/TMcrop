import React, { useState, useEffect, useCallback } from 'react';
import { Package, Barcode, History, Download, X, CheckSquare, Square } from 'lucide-react';
import { Material } from './MaterialFilters';
import { UnifiedModal, TabsList, TabsTrigger, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Checkbox, Pagination } from '@/components/ui';
import { enhancedApiClient } from '@/lib/apiClient';
import { showAlert } from '@/lib/dialogService';

interface OutboundRecord {
  executeCode: string;
  executeDate: string;
  executeStatus: string;
  applicant: string;
  department: string;
  operator: string;
  warehouseLocation: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  sourceApplicationCodes: string[];
  areaInfo: string;
  batchNo: string;
  applicationCode: string;
}

interface MaterialDetailModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MaterialDetailModal({ material, isOpen, onClose }: MaterialDetailModalProps) {
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [history, setHistory] = useState<OutboundRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 导出模式
  const [exportMode, setExportMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 切换到出库记录 tab 时加载数据
  const loadHistory = useCallback(async () => {
    if (!material?.code) return;
    setLoadingHistory(true);
    try {
      const url = `/materials/${encodeURIComponent(material.code)}/outbound-history`;
      const res = await enhancedApiClient.get<{ success: boolean; data: OutboundRecord[] }>(url);
      // enhancedApiClient 已自动解包 .data，res 可能是数组或 { data: [...] }
      const data = (res as any)?.data || (Array.isArray(res) ? res : []);
      setHistory(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      console.error('加载出库记录失败:', e);
      setHistory([]);
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoadingHistory(false);
    }
  }, [material?.code]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // 弹窗关闭时重置 tab 和导出模式
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('basic');
      setHistory([]);
      setExportMode(false);
      setSelectedIndices(new Set());
    }
  }, [isOpen]);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIndices(new Set(history.map((_, i) => i)));
    } else {
      setSelectedIndices(new Set());
    }
  };

  // 单选切换
  const handleToggleSelect = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // 导出为 Excel（HTML 表格格式，浏览器兼容）
  const handleExportExcel = () => {
    const selected = history.filter((_, i) => selectedIndices.has(i));
    if (selected.length === 0) {
      showAlert('请至少选择一条记录');
      return;
    }

    const headers = [
      '出库单号', '出库日期', '出库数量', '单位', '物料编码', '物料名称',
      '申请人', '部门', '区域/用途', '操作人', '库存地点',
      '来源申请单', '批次号', '状态',
    ];

    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>出库记录</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1">';

    // 表头
    html += '<tr style="background-color:#10b981;color:#ffffff;font-weight:bold;">';
    headers.forEach(h => { html += `<td>${h}</td>`; });
    html += '</tr>';

    // 数据行
    selected.forEach(r => {
      html += '<tr>';
      html += `<td>${r.executeCode}</td>`;
      html += `<td>${r.executeDate}</td>`;
      html += `<td>${r.quantity}</td>`;
      html += `<td>${r.unit}</td>`;
      html += `<td>${r.materialCode}</td>`;
      html += `<td>${r.materialName}</td>`;
      html += `<td>${r.applicant || ''}</td>`;
      html += `<td>${r.department || ''}</td>`;
      html += `<td>${r.areaInfo || ''}</td>`;
      html += `<td>${r.operator || ''}</td>`;
      html += `<td>${r.warehouseLocation || ''}</td>`;
      html += `<td>${(r.sourceApplicationCodes || []).join(', ')}</td>`;
      html += `<td>${r.batchNo || ''}</td>`;
      html += `<td>${r.executeStatus || ''}</td>`;
      html += '</tr>';
    });

    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${material.code}_${material.name}_出库记录_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);

    // 导出后退出导出模式
    setExportMode(false);
    setSelectedIndices(new Set());
  };

  // 分页数据
  const totalPages = Math.ceil(history.length / pageSize) || 1;
  const paginatedHistory = history.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // tab 切换时重置分页
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  if (!isOpen || !material) return null;

  // 汇总统计
  const totalOutbound = history.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`物料详情 — ${material.name}`}
      size="xxl"
    >
      {/* Tab切换 */}
      <TabsList selectedValue={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsTrigger value="basic">基本信息</TabsTrigger>
        <TabsTrigger value="history">
          出库记录 {history.length > 0 ? `(${history.length})` : ''}
        </TabsTrigger>
      </TabsList>

      {activeTab === 'basic' && (
        <>
          <div className="mb-6">
            <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              基本信息
            </h4>
            <div className="bg-emerald-50 rounded-lg p-4 mb-4 border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-600 block font-medium">条形码</span>
                  <span className="text-2xl font-mono font-bold text-emerald-700">{material.barcode}</span>
                </div>
                <Barcode className="w-12 h-12 text-emerald-600" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-500 block">物料编码</span>
                <span className="text-sm font-medium text-gray-900">{material.code}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">物料名称</span>
                <span className="text-sm font-medium text-gray-900">{material.name}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">物料分类</span>
                <span className="text-sm font-medium text-gray-900">{material.category}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">规格型号</span>
                <span className="text-sm font-medium text-gray-900">{material.specification}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">单位</span>
                <span className="text-sm font-medium text-gray-900">{material.unit}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">当前库存</span>
                <span className="text-sm font-medium text-gray-900">{material.quantity} {material.unit}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">最低库存</span>
                <span className="text-sm font-medium text-gray-900">{material.minStock} {material.unit}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">最高库存</span>
                <span className="text-sm font-medium text-gray-900">{material.maxStock} {material.unit}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">单价</span>
                <span className="text-sm font-medium text-gray-900">{material.price}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">供应商</span>
                <span className="text-sm font-medium text-gray-900">{material.supplier}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">存放位置</span>
                <span className="text-sm font-medium text-gray-900">{material.location}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">批次号</span>
                <span className="text-sm font-medium text-gray-900">{material.batchNo}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">生产日期</span>
                <span className="text-sm font-medium text-gray-900">{material.productionDate}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">有效期至</span>
                <span className="text-sm font-medium text-gray-900">{material.expiryDate}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">最后更新时间</span>
                <span className="text-sm font-medium text-gray-900">{material.lastUpdateTime}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">数据状态</span>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  material.dataStatus === '启用' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {material.dataStatus}
                </span>
              </div>
            </div>
          </div>

          {material.quantity < material.minStock && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-red-600 text-sm font-medium">⚠️ 库存预警</span>
              </div>
              <p className="text-red-600 text-sm mt-1">
                当前库存 ({material.quantity}) 低于最低库存警戒线 ({material.minStock})，请及时补充。
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div>
          {/* 工具栏：导出按钮 */}
          {history.length > 0 && !loadingHistory && !error && (
            <div className="flex items-center gap-2 mb-3">
              {exportMode ? (
                <>
                  <Button size="sm" onClick={handleExportExcel} disabled={selectedIndices.size === 0}>
                    <Download className="w-4 h-4" /> 导出选中 ({selectedIndices.size})
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setExportMode(false); setSelectedIndices(new Set()); }}>
                    <X className="w-4 h-4" /> 取消
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setExportMode(true)}>
                  <Download className="w-4 h-4" /> 导出
                </Button>
              )}
            </div>
          )}

          {/* 汇总卡片 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <span className="text-xs text-emerald-600">累计出库次数</span>
              <p className="text-lg font-bold text-emerald-700">{history.length} 次</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <span className="text-xs text-blue-600">累计出库数量</span>
              <p className="text-lg font-bold text-blue-700">{totalOutbound} {material.unit}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <span className="text-xs text-amber-600">当前库存</span>
              <p className="text-lg font-bold text-amber-700">{material.quantity} {material.unit}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <span className="text-xs text-purple-600">涉及出库单</span>
              <p className="text-lg font-bold text-purple-700">{new Set(history.map(r => r.executeCode)).size} 张</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {loadingHistory ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
              暂无出库记录
            </div>
          ) : (
            <Table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <TableHeader className="bg-gradient-to-r from-emerald-500 to-green-600">
                <TableRow>
                  {exportMode && (
                    <TableHead className="px-3 py-2 text-center text-sm font-semibold text-white w-10">
                      <Checkbox
                        checked={history.length > 0 && selectedIndices.size === history.length}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      />
                    </TableHead>
                  )}
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">出库单号</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">出库日期</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">出库数量</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">单位</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">申请人</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">部门</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">区域/用途</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">操作人</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">库存地点</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">来源申请单</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">批次号</TableHead>
                  <TableHead className="px-3 py-2 text-left text-sm font-semibold text-white">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200">
                {paginatedHistory.map((r, i) => {
                  const globalIdx = (currentPage - 1) * pageSize + i;
                  return (
                  <TableRow key={globalIdx} className={`hover:bg-emerald-50 ${selectedIndices.has(globalIdx) ? 'bg-emerald-50' : ''}`}>
                    {exportMode && (
                      <TableCell className="px-3 py-2 text-center">
                        <Checkbox
                          checked={selectedIndices.has(globalIdx)}
                          onCheckedChange={() => handleToggleSelect(globalIdx)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-3 py-2 text-sm font-mono text-blue-700">{r.executeCode}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-700">{r.executeDate}</TableCell>
                    <TableCell className="px-3 py-2 text-sm font-medium text-gray-900">{r.quantity}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-600">{r.unit}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-700">{r.applicant || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-700">{r.department || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-700 max-w-[180px] truncate" title={r.areaInfo}>{r.areaInfo}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-700">{r.operator || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-700">{r.warehouseLocation || '-'}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-700 font-mono">
                      {(r.sourceApplicationCodes || []).join(', ') || '-'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate" title={r.batchNo}>
                      {r.batchNo || '-'}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.executeStatus === '已出库' ? 'bg-green-100 text-green-700' :
                        r.executeStatus === '部分出库' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {r.executeStatus || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          )}

          {/* 分页 — 与物料库存列表格式一致 */}
          {history.length > 0 && !loadingHistory && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                pageSizeOptions={[10, 20, 50]}
                showPageSize
              />
            </div>
          )}
        </div>
      )}
    </UnifiedModal>
  );
}
