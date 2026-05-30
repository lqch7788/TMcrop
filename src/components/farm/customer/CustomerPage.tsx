/**
 * 客户档案管理页面
 */

import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomerStore } from '@/stores';
import { Customer } from '@/types/customer.types';
import { CustomerModal } from './CustomerModal';
import { showConfirm } from '@/lib/dialogService';

export function CustomerPage() {
  const { customers, isLoading, fetchCustomers, deleteCustomer } = useCustomerStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.customerName?.toLowerCase().includes(s) ||
      c.customerCode?.toLowerCase().includes(s) ||
      c.contactPerson?.toLowerCase().includes(s) ||
      c.contactPhone?.toLowerCase().includes(s)
    );
  });

  const handleEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditCustomer(null);
    setModalOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    const confirmed = await showConfirm({
      title: '删除确认',
      message: `确定要删除客户"${customer.customerName}"吗？此操作不可恢复。`,
      confirmText: '删除',
      cancelText: '取消',
    });
    if (confirmed) {
      await deleteCustomer(customer.id);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditCustomer(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 页面标题 */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">客户档案</h1>
            <p className="text-sm text-gray-500">管理客户信息</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            共 {customers.length} 个客户
          </Badge>
          <Button size="sm" onClick={handleAdd}>
            + 新增客户
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="px-6 py-3 bg-gray-50 border-b">
        <Input
          placeholder="搜索客户名称、编码、联系人、电话..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md bg-white"
        />
      </div>

      {/* 客户列表 */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>客户编码</TableHead>
                <TableHead>客户名称</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>收货地址</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {search ? '未找到匹配的客户' : '暂无客户数据'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono text-sm">{customer.customerCode}</TableCell>
                    <TableCell className="font-medium">{customer.customerName}</TableCell>
                    <TableCell>{customer.contactPerson || '-'}</TableCell>
                    <TableCell>{customer.contactPhone || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{customer.deliveryAddress || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{customer.remarks || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(customer)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(customer)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* 新增/编辑弹窗 */}
      <CustomerModal
        isOpen={modalOpen}
        customer={editCustomer}
        onClose={handleCloseModal}
        onSave={() => {
          handleCloseModal();
          fetchCustomers({ search });
        }}
      />
    </div>
  );
}

export default CustomerPage;
