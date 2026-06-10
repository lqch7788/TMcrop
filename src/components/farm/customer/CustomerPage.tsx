/**
 * 客户档案管理页面
 * 风格与订单管理页面完全一致
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  UserPlus,
  Building2,
  Phone,
  MapPin,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { DeleteConfirmModal as DeleteWarningModal } from '@/components/ui';
import { useCustomerStore } from '@/stores';
import { Customer } from '@/types/customer.types';
import { CustomerModal } from './CustomerModal';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import { showConfirm, showAlert } from '@/lib/dialogService';
import ActionToolbar from '@/components/warehouse/ActionToolbar';
import { todayLocal } from '@/lib/dateUtils';

export function CustomerPage() {
  const navigate = useNavigate();
  const { customers, isLoading, fetchCustomers, deleteCustomer } = useCustomerStore();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // 导出/删除模式状态
  const [exportMode, setExportMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  // 2026-06-10: 与订单管理一致——删除/导出用独立弹窗（替代原 showConfirm 直接弹 + 无格式选择）
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // 筛选数据
  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const s = search.toLowerCase();
    return customers.filter(c =>
      c.customerName?.toLowerCase().includes(s) ||
      c.customerCode?.toLowerCase().includes(s) ||
      c.contactPerson?.toLowerCase().includes(s) ||
      c.contactPhone?.toLowerCase().includes(s)
    );
  }, [customers, search]);

  // 统计数据
  const statsData = useMemo(() => {
    const total = customers.length;
    const thisMonth = customers.filter(c => {
      if (!c.createTime) return false;
      const createDate = new Date(c.createTime);
      const now = new Date();
      return createDate.getMonth() === now.getMonth() && createDate.getFullYear() === now.getFullYear();
    }).length;
    return { total, thisMonth };
  }, [customers]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredCustomers.slice(start, end);
  }, [filteredCustomers, pagination]);

  const totalPages = Math.ceil(filteredCustomers.length / pagination.pageSize) || 1;

  // 搜索
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
  };

  // 重置
  const handleReset = () => {
    setSearch('');
    setPagination({ ...pagination, current: 1 });
  };

  // 删除模式相关
  const handleDeleteClick = () => {
    setDeleteMode(true);
  };

  const handleCancelDelete = () => {
    setDeleteMode(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditCustomer(null);
    setModalOpen(true);
  };

  const handleDelete = async (ids: string[]) => {
    if (await showConfirm(`确定要删除选中的 ${ids.length} 条记录吗？`)) {
      for (const id of ids) {
        await deleteCustomer(id);
      }
      setSelectedRows([]);
    }
  };

  // 2026-06-10: 删除确认弹窗（与订单管理 DeleteWarningModal 流程一致）
  const handleAskDelete = (ids: string[]) => {
    setPendingDeleteIds(ids);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    const ids = pendingDeleteIds;
    setShowDeleteModal(false);
    setPendingDeleteIds([]);
    setDeleteMode(false);
    try {
      for (const id of ids) {
        await deleteCustomer(id);
      }
      setSelectedRows([]);
      await showAlert(`已删除 ${ids.length} 条客户记录`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await showAlert(`删除失败：${msg || '请稍后重试'}`);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditCustomer(null);
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(row => row !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map(c => c.id));
    }
  };

  // 导出相关
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleExportSelectAll = () => {
    if (selectedRows.length === filteredCustomers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredCustomers.map(c => c.id));
    }
  };

  const handleExportCancel = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      return;
    }
    // 2026-06-10: 与订单管理一致——先打开 ExportFormatModal 让用户选格式
    setShowExportModal(true);
  };

  // 2026-06-10: 实际导出（根据 exportFormat 生成 xlsx/csv/word）
  const handleDoExport = async () => {
    const selectedData = filteredCustomers.filter(c => selectedRows.includes(c.id));
    const headers = ['客户编码', '客户名称', '联系人', '联系电话', '收货地址', '备注', '创建时间'];
    const exportData = selectedData.map(c => ({
      '客户编码': c.customerCode,
      '客户名称': c.customerName,
      '联系人': c.contactPerson || '',
      '联系电话': c.contactPhone || '',
      '收货地址': c.deliveryAddress || '',
      '备注': c.remarks || '',
      '创建时间': c.createTime || '',
    }));

    const fileNameBase = `客户管理_${todayLocal()}`;

    // RFC4180 CSV 转义
    const csvEscape = (v: unknown): string => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    try {
      if (exportFormat === 'csv') {
        const lines = [
          headers.join(','),
          ...exportData.map(row => headers.map(h => csvEscape(row[h as keyof typeof row])).join(',')),
        ];
        const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${fileNameBase}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else if (exportFormat === 'word') {
        const escapeHtml = (s: unknown): string => String(s ?? '')
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${escapeHtml((row as any)[h])}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-word;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${fileNameBase}.doc`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        // excel：HTML table 写入 .xls（与订单管理一致）
        const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${(row as any)[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${fileNameBase}.xls`;
        a.click();
        URL.revokeObjectURL(a.href);
      }

      setExportMode(false);
      setSelectedRows([]);
      setShowExportModal(false);
    } catch (err) {
      await showAlert('导出失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/crop/order')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
              <p className="text-gray-500">管理客户档案信息</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 - 紧凑型淡彩色 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{statsData.total}</p>
              <p className="text-xs text-gray-500">客户总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{statsData.thisMonth}</p>
              <p className="text-xs text-gray-500">本月新增</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{statsData.total}</p>
              <p className="text-xs text-gray-500">有效客户</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500">待跟进</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选工具栏 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索客户名称、编码、联系人、电话..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default" onClick={handleSearch}>
              <Search className="w-4 h-4" />
              搜索
            </Button>
            <Button size="sm" variant="warning" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
          </div>
        </div>
      </div>

      {/* 操作工具栏 */}
      <ActionToolbar
        title="客户列表"
        batchEditMode={false}
        deleteMode={deleteMode}
        exportMode={exportMode}
        selectedRows={selectedRows}
        lowStockCount={0}
        filters={{ showLowStock: false }}
        onLowStockToggle={() => {}}
        onBatchEdit={() => {}}
        onDelete={handleDeleteClick}
        onExport={handleExportClick}
        onConfirmBatchEdit={() => {}}
        onCancelBatchEdit={() => {}}
        onConfirmDelete={async () => {
          // 2026-06-10: 改为打开 DeleteWarningModal 弹窗（与订单管理一致）
          if (selectedRows.length > 0) handleAskDelete(selectedRows);
        }}
        onCancelDelete={handleCancelDelete}
        onConfirmExport={handleConfirmExport}
        onCancelExport={handleExportCancel}
        onAdd={handleAdd}
        canCreate={true}
        canEdit={false}
        canDelete={true}
        canExport={true}
        showLowStockButton={false}
        noCard={true}
      />

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(exportMode || deleteMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold w-12">
                    <Checkbox
                      checked={selectedRows.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onCheckedChange={handleExportSelectAll}
                      className="border-white rounded"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold">客户编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">客户名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">联系人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">联系电话</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">收货地址</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">备注</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={(exportMode || deleteMode) ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                paginatedData.map((customer) => (
                  <tr key={customer.id} className="hover:bg-blue-100 transition-colors">
                    {(exportMode || deleteMode) && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedRows.includes(customer.id)}
                          onCheckedChange={() => handleSelectRow(customer.id)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm font-mono">{customer.customerCode}</td>
                    <td className="px-4 py-3 text-sm font-medium">{customer.customerName}</td>
                    <td className="px-4 py-3 text-sm">{customer.contactPerson || '-'}</td>
                    <td className="px-4 py-3 text-sm">{customer.contactPhone || '-'}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{customer.deliveryAddress || '-'}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{customer.remarks || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(customer)}
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAskDelete([customer.id])}
                          title="删除"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {filteredCustomers.length} 条记录
          </div>
          <Pagination
            currentPage={pagination.current}
            totalPages={totalPages}
            onPageChange={(page) => setPagination({ ...pagination, current: page })}
            pageSize={pagination.pageSize}
            onPageSizeChange={(size) => setPagination({ pageSize: size, current: 1 })}
            pageSizeOptions={[10, 20, 50]}
            showPageSize
          />
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <CustomerModal
        isOpen={modalOpen}
        customer={editCustomer}
        onClose={handleCloseModal}
        onSave={() => {
          handleCloseModal();
          fetchCustomers();
        }}
      />

      {/* 删除警告弹窗 - 与订单管理一致 */}
      <DeleteWarningModal
        isOpen={showDeleteModal}
        selectedCount={pendingDeleteIds.length}
        onClose={() => {
          setShowDeleteModal(false);
          setPendingDeleteIds([]);
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* 导出格式选择弹窗 - 与订单管理一致 */}
      <ExportFormatModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportFormat={exportFormat}
        onFormatChange={setExportFormat}
        onConfirm={handleDoExport}
        selectedCount={selectedRows.length}
      />
    </div>
  );
}

export default CustomerPage;
