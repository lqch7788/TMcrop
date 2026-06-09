import React, { useState } from 'react';
import { Calendar, Check, MessageSquare, Send, User, X, XCircle } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import type { Staff, SwapRequest } from './types';
import { Label } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

interface SwapRequestModalProps {
  staffList: Staff[];
  onSubmit: (request: {
    requesterId: string;
    requesterName: string;
    targetId: string;
    targetName: string;
    originalDate: string;
    targetDate: string;
    reason: string;
  }) => void;
  onClose: () => void;
}

export function SwapRequestModal({ staffList, onSubmit, onClose }: SwapRequestModalProps) {
  // 深度输入框样式
  const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

  const [formData, setFormData] = useState({
    requesterId: '',
    requesterName: '',
    targetId: '',
    targetName: '',
    originalDate: '',
    targetDate: '',
    reason: '',
  });

  // 选择员工
  const handleRequesterChange = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (staff) {
      setFormData(prev => ({
        ...prev,
        requesterId: staff.id,
        requesterName: staff.name,
      }));
    }
  };

  const handleTargetChange = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (staff) {
      setFormData(prev => ({
        ...prev,
        targetId: staff.id,
        targetName: staff.name,
      }));
    }
  };

  // 提交
  const handleSubmit = () => {
    if (!formData.requesterId || !formData.targetId || !formData.originalDate || !formData.targetDate) {
      showAlert('请填写完整信息');
      return;
    }
    if (formData.requesterId === formData.targetId) {
      showAlert('不能与自己调班');
      return;
    }
    onSubmit(formData);
    onClose();
  };

  const content = (
    <div className="space-y-4">
      {/* 申请人 */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          申请人
        </Label>
        <select
          value={formData.requesterId}
          onChange={e => handleRequesterChange(e.target.value)}
          className={deepInputClass}
        >
          <option value="">选择申请人</option>
          {staffList.map(staff => (
            <option key={staff.id} value={staff.id}>
              {staff.name} - {staff.workZone}
            </option>
          ))}
        </select>
      </div>

      {/* 原排班日期 */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          原排班日期
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
          <DatePicker
            selected={formData.originalDate ? new Date(formData.originalDate + 'T00:00:00') : undefined}
            onChange={(date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              setFormData(prev => ({ ...prev, originalDate: `${year}-${month}-${day}` }));
            }}
            className="w-full pl-9 border-2 border-gray-300 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 目标员工 */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          调班对象
        </Label>
        <select
          value={formData.targetId}
          onChange={e => handleTargetChange(e.target.value)}
          className={deepInputClass}
        >
          <option value="">选择调班对象</option>
          {staffList.filter(s => s.id !== formData.requesterId).map(staff => (
            <option key={staff.id} value={staff.id}>
              {staff.name} - {staff.workZone}
            </option>
          ))}
        </select>
      </div>

      {/* 目标日期 */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          目标日期
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
          <DatePicker
            selected={formData.targetDate ? new Date(formData.targetDate + 'T00:00:00') : undefined}
            onChange={(date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              setFormData(prev => ({ ...prev, targetDate: `${year}-${month}-${day}` }));
            }}
            className="w-full pl-9 border-2 border-gray-300 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 调班原因 */}
      <div>
        <Label className="block text-sm font-medium text-gray-600 mb-1">
          调班原因
        </Label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <textarea
            value={formData.reason}
            onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="请输入调班原因..."
            rows={3}
            className={`${deepInputClass} w-full pl-9 pr-4 resize-none`}
          />
        </div>
      </div>
    </div>
  );

  const footer = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onClose}
      >
        <X className="w-4 h-4" /> 取消
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={handleSubmit}
      >
        <Send className="w-4 h-4" />
        提交申请
      </Button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={true}
      onClose={onClose}
      title="调班申请"
      size="xl"
      showFooter={true}
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}

// 调班申请列表组件
interface SwapRequestListProps {
  requests: SwapRequest[];
  onHandle: (id: string, status: '已同意' | '已拒绝') => void;
}

export function SwapRequestList({ requests, onHandle }: SwapRequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无调班申请
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map(request => (
        <div
          key={request.id}
          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-800">{request.requesterName}</span>
                <span className="text-gray-400">与</span>
                <span className="font-medium text-gray-800">{request.targetName}</span>
                <span className={`
                  px-2 py-0.5 rounded text-xs font-medium
                  ${request.status === '待审批' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${request.status === '已同意' ? 'bg-green-100 text-green-700' : ''}
                  ${request.status === '已拒绝' ? 'bg-red-100 text-red-700' : ''}
                `}>
                  {request.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                <span>原日期: {request.originalDate}</span>
                <span>目标日期: {request.targetDate}</span>
              </div>
              {request.reason && (
                <p className="text-sm text-gray-500 mt-2 flex items-start gap-1">
                  <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {request.reason}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                申请时间: {request.createTime}
              </p>
            </div>

            {request.status === '待审批' && (
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onHandle(request.id, '已同意')}
                  className="text-green-600 hover:bg-green-50"
                  title="同意"
                >
                  <Check className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onHandle(request.id, '已拒绝')}
                  className="text-red-600 hover:bg-red-50"
                  title="拒绝"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SwapRequestModal;
