import { X } from 'lucide-react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { TempWorkerDetailModalProps, StaffStatus } from './types';
import { Label } from '@/components/ui/label';

/**
 * 获取状态对应的样式
 */
function getStatusClass(status: StaffStatus): string {
  switch (status) {
    case '在职':
      return 'bg-emerald-100 text-emerald-700';
    case '离职':
      return 'bg-gray-100 text-gray-600';
    case '停薪留职':
      return 'bg-amber-100 text-amber-700';
    case '试用期':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * 临时工详情弹窗组件
 */
export function TempWorkerDetailModal({
  record,
  open,
  onClose,
}: TempWorkerDetailModalProps) {
  if (!open || !record) return null;

  const content = (
    <div>
      {/* 基本信息 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">基本信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-xs text-gray-400 mb-1">工号</Label>
            <div className="text-sm text-gray-900 font-mono">
              {record.employeeCode}
            </div>
          </div>
          <div>
            <Label className="block text-xs text-gray-400 mb-1">姓名</Label>
            <div className="text-sm text-gray-900">{record.name}</div>
          </div>
          <div>
            <Label className="block text-xs text-gray-400 mb-1">身份证号</Label>
            <div className="text-sm text-gray-900 font-mono">
              {record.idCard}
            </div>
          </div>
          <div>
            <Label className="block text-xs text-gray-400 mb-1">联系电话</Label>
            <div className="text-sm text-gray-900">{record.phone}</div>
          </div>
          <div>
            <Label className="block text-xs text-gray-400 mb-1">工人类型</Label>
            <div className="text-sm text-gray-900">{record.workerType}</div>
          </div>
          <div>
            <Label className="block text-xs text-gray-400 mb-1">合同类型</Label>
            <div className="text-sm text-gray-900">{record.contractType}</div>
          </div>
          <div>
            <Label className="block text-xs text-gray-400 mb-1">入职日期</Label>
            <div className="text-sm text-gray-900">{record.joinDate}</div>
          </div>
          <div>
            <Label className="block text-xs text-gray-400 mb-1">状态</Label>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                record.status
              )}`}
            >
              {record.status}
            </span>
          </div>
        </div>
      </div>

      {/* 薪酬信息 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">薪酬信息</h3>
        <div className="grid grid-cols-2 gap-4">
          {record.dailyWage && (
            <div>
              <Label className="block text-xs text-gray-400 mb-1">日工资</Label>
              <div className="text-sm text-gray-900">
                ¥{record.dailyWage}/天
              </div>
            </div>
          )}
          {record.hourlyWage && (
            <div>
              <Label className="block text-xs text-gray-400 mb-1">时工资</Label>
              <div className="text-sm text-gray-900">
                ¥{record.hourlyWage}/时
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 技能标签 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">技能标签</h3>
        <div className="flex flex-wrap gap-2">
          {record.skillTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 作业区域 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">作业区域</h3>
        <div className="flex flex-wrap gap-2">
          {record.workZones.map((zone) => (
            <span
              key={zone}
              className="inline-flex items-center px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs"
            >
              {zone}
            </span>
          ))}
        </div>
      </div>

      {/* 扩展信息 */}
      {(record.insuranceType || record.source || record.maxWorkDays) && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">扩展信息</h3>
          <div className="grid grid-cols-2 gap-4">
            {record.insuranceType && (
              <div>
                <Label className="block text-xs text-gray-400 mb-1">保险类型</Label>
                <div className="text-sm text-gray-900">{record.insuranceType}</div>
              </div>
            )}
            {record.source && (
              <div>
                <Label className="block text-xs text-gray-400 mb-1">来源</Label>
                <div className="text-sm text-gray-900">{record.source}</div>
              </div>
            )}
            {record.maxWorkDays && (
              <div>
                <Label className="block text-xs text-gray-400 mb-1">
                  本批次最大用工天数
                </Label>
                <div className="text-sm text-gray-900">
                  {record.maxWorkDays} 天
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const footer = (
    <Button variant="outline" onClick={onClose}>
      关闭
    </Button>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="员工详情"
      size="lg"
      showFooter={true}
      headerAction={
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
