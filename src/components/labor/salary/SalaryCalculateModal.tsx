import { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SalaryCalculateModalProps, SalaryCalculateData } from './types';

/**
 * 工资计算弹窗 (针对临时工)
 */
export function SalaryCalculateModal({
  record,
  open,
  onClose,
  onConfirm,
}: SalaryCalculateModalProps) {
  const [formData, setFormData] = useState<SalaryCalculateData>({
    daysWorked: undefined,
    hoursWorked: undefined,
    dailyRate: undefined,
    hourlyRate: undefined,
  });

  // 当记录变化时重置表单
  useEffect(() => {
    if (record) {
      setFormData({
        daysWorked: undefined,
        hoursWorked: undefined,
        dailyRate: undefined,
        hourlyRate: undefined,
      });
    }
  }, [record]);

  if (!open || !record) return null;

  // 计算预览
  const calculatePreview = (): number => {
    if (record.calcType === '日薪制' && formData.daysWorked && formData.dailyRate) {
      return formData.daysWorked * formData.dailyRate;
    } else if (record.calcType === '时薪制' && formData.hoursWorked && formData.hourlyRate) {
      return formData.hoursWorked * formData.hourlyRate;
    }
    return 0;
  };

  const preview = calculatePreview();

  const handleSubmit = () => {
    onConfirm(formData);
    onClose();
  };

  const content = (
    <div>
      {/* 员工信息 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          员工：<span className="font-medium text-gray-900">{record.staffName}</span>
        </p>
        <p className="text-sm text-gray-600">
          月份：<span className="font-medium text-gray-900">{record.month}</span>
        </p>
        <p className="text-sm text-gray-600">
          计算方式：<span className="font-medium text-gray-900">{record.calcType}</span>
        </p>
      </div>

      {/* 计算表单 */}
      {record.calcType === '日薪制' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              出勤天数
            </label>
            <Input
              type="number"
              min="0"
              placeholder="请输入出勤天数"
              value={formData.daysWorked || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  daysWorked: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日工资 (元/天)
            </label>
            <Input
              type="number"
              min="0"
              placeholder="请输入日工资"
              value={formData.dailyRate || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dailyRate: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      )}

      {record.calcType === '时薪制' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              实际工时
            </label>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="请输入实际工时"
              value={formData.hoursWorked || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  hoursWorked: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              时工资 (元/小时)
            </label>
            <Input
              type="number"
              min="0"
              placeholder="请输入时工资"
              value={formData.hourlyRate || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  hourlyRate: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      )}

      {/* 计算预览 */}
      {preview > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600">
            计算结果：<span className="font-bold text-lg">¥{preview.toLocaleString()}</span>
          </p>
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="flex gap-3">
      <Button variant="outline" onClick={onClose} className="flex-1">
        取消
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={preview === 0}
        className="flex-1 bg-blue-600 hover:bg-blue-700"
      >
        确认计算
      </Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="工资计算"
      size="sm"
      showFooter={true}
      headerAction={
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </Button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
