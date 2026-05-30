/**
 * 客户档案新增/编辑弹窗
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/TextArea';
import { useCustomerStore } from '@/stores';
import { Customer } from '@/types/customer.types';
import { showAlert } from '@/lib/dialogService';

interface CustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSave: () => void;
}

// 生成客户编码：C + 时间戳
const generateCustomerCode = (): string => {
  return `C${Date.now()}`;
};

export function CustomerModal({ isOpen, customer, onClose, onSave }: CustomerModalProps) {
  const { addCustomer, updateCustomer } = useCustomerStore();
  const isEdit = !!customer;

  const [formData, setFormData] = useState({
    customerCode: '',
    customerName: '',
    contactPerson: '',
    contactPhone: '',
    deliveryAddress: '',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setFormData({
          customerCode: customer.customerCode || '',
          customerName: customer.customerName || '',
          contactPerson: customer.contactPerson || '',
          contactPhone: customer.contactPhone || '',
          deliveryAddress: customer.deliveryAddress || '',
          remarks: customer.remarks || '',
        });
      } else {
        setFormData({
          customerCode: generateCustomerCode(),
          customerName: '',
          contactPerson: '',
          contactPhone: '',
          deliveryAddress: '',
          remarks: '',
        });
      }
    }
  }, [isOpen, customer]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) {
      await showAlert({ title: '提示', message: '请输入客户名称', icon: 'warning' });
      return;
    }

    setLoading(true);
    try {
      if (isEdit && customer) {
        await updateCustomer(customer.id, formData);
      } else {
        await addCustomer(formData as Omit<Customer, 'id' | 'createTime' | 'updateTime'>);
      }
      await showAlert({ title: '成功', message: isEdit ? '客户已更新' : '客户已添加', icon: 'success' });
      onSave();
    } catch (error) {
      await showAlert({ title: '错误', message: `操作失败: ${(error as Error).message}`, icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
        取消
      </Button>
      <Button size="sm" onClick={handleSubmit} disabled={loading}>
        {loading ? '保存中...' : '保存'}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? '编辑客户' : '新增客户'} size="md" showFooter={footer}>
      <div className="space-y-4">
        <div>
          <Label className="text-gray-700">客户编码</Label>
          <Input value={formData.customerCode} disabled className="border-gray-300 bg-gray-50" />
        </div>
        <div>
          <Label className="text-gray-700">
            客户名称 <span className="text-red-500">*</span>
          </Label>
          <Input
            value={formData.customerName}
            onChange={(e) => handleChange('customerName', e.target.value)}
            placeholder="请输入客户名称"
            className="border-gray-300"
          />
        </div>
        <div>
          <Label className="text-gray-700">联系人</Label>
          <Input
            value={formData.contactPerson}
            onChange={(e) => handleChange('contactPerson', e.target.value)}
            placeholder="请输入联系人姓名"
            className="border-gray-300"
          />
        </div>
        <div>
          <Label className="text-gray-700">联系电话</Label>
          <Input
            value={formData.contactPhone}
            onChange={(e) => handleChange('contactPhone', e.target.value)}
            placeholder="请输入联系电话"
            className="border-gray-300"
          />
        </div>
        <div>
          <Label className="text-gray-700">收货地址</Label>
          <TextArea
            value={formData.deliveryAddress}
            onChange={(e) => handleChange('deliveryAddress', e.target.value)}
            placeholder="请输入收货地址"
            className="border-gray-300"
            rows={2}
          />
        </div>
        <div>
          <Label className="text-gray-700">备注</Label>
          <TextArea
            value={formData.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            placeholder="请输入备注信息"
            className="border-gray-300"
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
}
