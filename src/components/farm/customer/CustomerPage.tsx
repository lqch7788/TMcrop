/**
 * 客户档案管理页面
 * 风格与订单管理页面完全一致
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, UserPlus, Building2, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/Pagination';
import { useCustomerStore } from '@/stores';
import { Customer } from '@/types/customer.types';
import { CustomerModal } from './CustomerModal';
import { showConfirm } from '@/lib/dialogService';
import ActionToolbar from '@/components/warehouse/ActionToolbar';

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

  const handleConfirmExport = async () => {
    if (selectedRows.length === 0) {
      return;
    }
    // 导出逻辑
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

    let content = headers.join(',') + '\n' + exportData.map(row =>
      headers.map(h => `"${row[h] || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `客户管理_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExportMode(false);
    setSelectedRows([]);
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
              <ArrowLeft className="w-5 h-5" />
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
              搜索
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
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
          if (await showConfirm(`确定要删除选中的 ${selectedRows.length} 条记录吗？`)) {
            await handleDelete(selectedRows);
            setDeleteMode(false);
          }
        }}
        onCancelDelete={handleCancelDelete}
        onConfirmExport={handleConfirmExport}
        onCancelExport={handleExportCancel}
        onAdd={handleAdd}
        canCreate={true}
        canEdit={true}
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
                  <tr key={customer.id} className="hover:bg-emerald-50 transition-colors">
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                            <path d="m15 5 4 4"/>
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (await showConfirm(`确定要删除客户 ${customer.customerName} 吗？`)) {
                              await deleteCustomer(customer.id);
                              setSelectedRows([]);
                            }
                          }}
                          title="删除"
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            <line x1="10" x2="10" y1="11" y2="17"/>
                            <line x1="14" x2="14" y1="11" y2="17"/>
                          </svg>
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
    </div>
  );
}

export default CustomerPage;
