// 统一删除警告弹窗组件
import { AlertTriangle, Trash2 } from 'lucide-react';
import React from 'react';
import { Button } from '../ui/button';

// 新的统一接口
interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount?: number;
  onClose?: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

// 旧版接口类型1: show, onCancel, onConfirm
interface DeleteWarningModalLegacyProps1 {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  warningTitle?: string;
  warningMessages?: string[];
}

// 旧版接口类型2: isOpen, selectedCount, onClose, onConfirm
interface DeleteWarningModalLegacyProps2 {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
}

export function DeleteWarningModal({
  isOpen,
  selectedCount = 0,
  onClose,
  onConfirm,
  title = '删除警告',
  description,
}: DeleteWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-2 mb-6">
          {description ? (
            <p>{description}</p>
          ) : (
            <>
              <p>确定要删除选中的 <strong>{selectedCount}</strong> 个项目吗？</p>
              <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            确认
          </Button>
        </div>
      </div>
    </div>
  );
}

// 向后兼容别名 - 旧版接口类型1 (show, onCancel, onConfirm)
export function DeleteWarningModalLegacy1({
  show,
  onCancel,
  onConfirm,
  warningTitle = '批量删除警告',
  warningMessages = ['所有选中的数据将被永久删除', '历史数据将无法恢复'],
}: DeleteWarningModalLegacyProps1) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{warningTitle}</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-2 mb-6">
          <p>删除后可能存在以下问题：</p>
          <ul className="list-disc list-inside space-y-1">
            {warningMessages.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            确认
          </Button>
        </div>
      </div>
    </div>
  );
}

// 向后兼容别名 - 旧版接口类型2 (isOpen, selectedCount, onClose, onConfirm)
export function DeleteWarningModalLegacy2({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
  title = '删除警告',
}: DeleteWarningModalLegacyProps2) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-3 mb-6">
            <p>确定要删除选中的 <strong>{selectedCount}</strong> 个项目吗？</p>
            <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button variant="destructive" onClick={onConfirm} className="flex-1">
              确认删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 默认导出
export default DeleteWarningModal;
