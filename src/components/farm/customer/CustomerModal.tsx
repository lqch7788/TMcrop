/**
 * 客户档案新增/编辑弹窗
 */

import React, { useState, useEffect, useCallback } from 'react';
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

// 生成客户编码：KH + 年月日(8位) + 4位流水号
const generateCustomerCode = (existingCodes: string[] = []): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 查找当天已有的最大流水号
  let maxSeq = 0;
  const prefix = `KH${dateStr}`;
  existingCodes.forEach(code => {
    if (code.startsWith(prefix)) {
      const seqStr = code.slice(-4);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  // 下一个流水号
  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `KH${dateStr}${nextSeq}`;
};

export function CustomerModal({ isOpen, customer, onClose, onSave }: CustomerModalProps) {
  const { customers, addCustomer, updateCustomer, fetchCustomers } = useCustomerStore();
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
      // 打开弹窗时刷新客户列表，确保有最新的编码数据
      fetchCustomers();
    }
  }, [isOpen, fetchCustomers]);

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
        // 新增时，传入已有编码列表自动生成
        const existingCodes = customers.map(c => c.customerCode).filter(Boolean);
        setFormData({
          customerCode: generateCustomerCode(existingCodes),
          customerName: '',
          contactPerson: '',
          contactPhone: '',
          deliveryAddress: '',
          remarks: '',
        });
      }
    }
  }, [isOpen, customer, customers]);

  // 手动生成编码
  const handleGenerateCode = () => {
    const existingCodes = customers.map(c => c.customerCode).filter(Boolean);
    setFormData(prev => ({ ...prev, customerCode: generateCustomerCode(existingCodes) }));
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) {
      await showAlert('请输入客户名称');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && customer) {
        await updateCustomer(customer.id, formData);
      } else {
        await addCustomer(formData as Omit<Customer, 'id' | 'createTime' | 'updateTime'>);
      }
      await showAlert(isEdit ? '客户已更新' : '客户已添加');
      onSave();
    } catch (error) {
      await showAlert(`操作失败: ${(error as Error).message}`);
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

  // 输入框深度样式 - 增加内边距和阴影
  const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? '编辑客户' : '新增客户'}
      size="xxl"
      width={1000}
      height={800}
      showFooter={true}
      footer={footer}
    >
      <div className="space-y-6 p-2">
        {/* 第一行：客户编码、客户名称 */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-gray-700 text-base font-medium mb-2 block">客户编码</Label>
            <div className="flex gap-2">
              <Input
                value={formData.customerCode}
                onChange={(e) => handleChange('customerCode', e.target.value)}
                placeholder="请输入或点击生成"
                className={deepInputClass}
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleGenerateCode}
                className="whitespace-nowrap"
              >
                生成
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-gray-700 text-base font-medium mb-2 block">
              客户名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.customerName}
              onChange={(e) => handleChange('customerName', e.target.value)}
              placeholder="请输入客户名称"
              className={deepInputClass}
            />
          </div>
        </div>

        {/* 第二行：联系人、联系电话 */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-gray-700 text-base font-medium mb-2 block">联系人</Label>
            <Input
              value={formData.contactPerson}
              onChange={(e) => handleChange('contactPerson', e.target.value)}
              placeholder="请输入联系人姓名"
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="text-gray-700 text-base font-medium mb-2 block">联系电话</Label>
            <Input
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              placeholder="请输入联系电话"
              className={deepInputClass}
            />
          </div>
        </div>

        {/* 第三行：收货地址（占两列） */}
        <div>
          <Label className="text-gray-700 text-base font-medium mb-2 block">收货地址</Label>
          <TextArea
            value={formData.deliveryAddress}
            onChange={(e) => handleChange('deliveryAddress', e.target.value)}
            placeholder="请输入收货地址"
            className={`${deepInputClass} min-h-[80px]`}
            rows={3}
          />
        </div>

        {/* 第四行：备注（占两列） */}
        <div>
          <Label className="text-gray-700 text-base font-medium mb-2 block">备注</Label>
          <TextArea
            value={formData.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            placeholder="请输入备注信息"
            className={`${deepInputClass} min-h-[100px]`}
            rows={4}
          />
        </div>
      </div>
    </Modal>
  );
}
