/**
 * 劳动风险预警表单弹窗
 */

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DatePicker } from '@/components/ui/DatePicker';
import { Label } from '@/components/ui/label';
import { RiskAlert, AlertType, AlertLevel } from './types';
import { AlertTypeNames, AlertLevelNames } from './types';
import { showAlert } from '@/lib/dialogService';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface RiskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: Omit<RiskAlert, 'id' | 'createTime'>) => void;
  title?: string;
  editingRecord?: RiskAlert | null;
}

export function RiskFormModal({
  isOpen,
  onClose,
  onConfirm,
  title = '新建风险预警',
  editingRecord,
}: RiskFormModalProps) {
  const [formData, setFormData] = useState({
    alertType: editingRecord?.alertType || 'overtime' as AlertType,
    alertTypeName: editingRecord?.alertTypeName || AlertTypeNames.overtime,
    level: editingRecord?.level || 'warning' as AlertLevel,
    title: editingRecord?.title || '',
    content: editingRecord?.content || '',
    staffId: editingRecord?.staffId || '',
    staffName: editingRecord?.staffName || '',
    department: editingRecord?.department || '',
    status: editingRecord?.status || 'pending' as const,
    handleTime: editingRecord?.handleTime || '',
    handler: editingRecord?.handler || '',
    remarks: editingRecord?.remarks || '',
  });

  const handleAlertTypeChange = (type: AlertType) => {
    setFormData({
      ...formData,
      alertType: type,
      alertTypeName: AlertTypeNames[type],
    });
  };

  const handleSubmit = () => {
    if (!formData.title) {
      showAlert('请输入预警标题');
      return;
    }
    if (!formData.content) {
      showAlert('请输入预警内容');
      return;
    }
    onConfirm(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      onSubmit={handleSubmit}
      submitText="确认"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 预警类型 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">预警类型</Label>
            <select
              value={formData.alertType}
              onChange={(e) => handleAlertTypeChange(e.target.value as AlertType)}
              className={deepInputClass}
            >
              <option value="overtime">超时加班</option>
              <option value="high_temp">高温作业</option>
              <option value="schedule_gap">排班空缺</option>
              <option value="contract_expiry">合同到期</option>
              <option value="certificate_expiry">证件过期</option>
              <option value="turnover">频繁离职</option>
            </select>
          </div>

          {/* 预警等级 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">预警等级</Label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value as AlertLevel })}
              className={deepInputClass}
            >
              <option value="warning">一般提醒</option>
              <option value="danger">需要注意</option>
              <option value="critical">紧急处理</option>
            </select>
          </div>

          {/* 部门 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">部门</Label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className={deepInputClass}
              placeholder="请输入部门"
            />
          </div>

          {/* 员工工号 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">员工工号</Label>
            <input
              type="text"
              value={formData.staffId}
              onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
              className={deepInputClass}
              placeholder="请输入工号"
            />
          </div>

          {/* 员工姓名 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">员工姓名</Label>
            <input
              type="text"
              value={formData.staffName}
              onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
              className={deepInputClass}
              placeholder="请输入姓名"
            />
          </div>

          {/* 状态 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'handled' })}
              className={deepInputClass}
            >
              <option value="pending">待处理</option>
              <option value="handled">已处理</option>
            </select>
          </div>

          {/* 处理人 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">处理人</Label>
            <input
              type="text"
              value={formData.handler}
              onChange={(e) => setFormData({ ...formData, handler: e.target.value })}
              className={deepInputClass}
              placeholder="请输入处理人"
            />
          </div>

          {/* 处理时间 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">处理时间</Label>
            <DatePicker
              selected={formData.handleTime ? new Date(formData.handleTime) : undefined}
              onChange={(date) => setFormData({ ...formData, handleTime: date.toISOString().slice(0, 10) })}
              className="w-full h-10"
            />
          </div>
        </div>

        {/* 预警标题 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">预警标题</Label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={deepInputClass}
            placeholder="请输入预警标题"
          />
        </div>

        {/* 预警内容 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">预警内容</Label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            rows={3}
            placeholder="请输入预警内容"
          />
        </div>

        {/* 处理备注 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">处理备注</Label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            rows={2}
            placeholder="请输入处理备注"
          />
        </div>
      </div>
    </Modal>
  );
}

export default RiskFormModal;
