import React, { useState, useEffect } from 'react';
import { Modal, NumberInput, Label } from '@/components/ui';
import type { SalaryRecord, SalaryCalcType, SalaryStatus } from './types';
import { showAlert } from '@/lib/dialogService';

interface SalaryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: Omit<SalaryRecord, 'id'>) => void;
  title?: string;
}

const calcTypes: SalaryCalcType[] = ['月薪制', '日薪制', '时薪制'];
const statusOptions: SalaryStatus[] = ['待确认', '已确认', '已发放'];
const staffOptions = [
  { id: 'W001', name: '张明' },
  { id: 'W002', name: '李华' },
  { id: 'W003', name: '王芳' },
  { id: 'W004', name: '赵强' },
  { id: 'W005', name: '陈静' },
];

export function SalaryFormModal({
  isOpen,
  onClose,
  onConfirm,
  title = '新建工资记录',
}: SalaryFormModalProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [formData, setFormData] = useState({
    staffId: '',
    staffName: '',
    month: currentMonth,
    calcType: '月薪制' as SalaryCalcType,
    baseSalary: 0,
    overtimePay: 0,
    bonuses: 0,
    deductions: 0,
    lateDeductions: 0,
    absenceDeductions: 0,
    socialSecurity: 0,
    housingFund: 0,
    personalTax: 0,
    netSalary: 0,
    status: '待确认' as SalaryStatus,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        staffId: '',
        staffName: '',
        month: currentMonth,
        calcType: '月薪制',
        baseSalary: 0,
        overtimePay: 0,
        bonuses: 0,
        deductions: 0,
        lateDeductions: 0,
        absenceDeductions: 0,
        socialSecurity: 0,
        housingFund: 0,
        personalTax: 0,
        netSalary: 0,
        status: '待确认',
      });
    }
  }, [isOpen, currentMonth]);

  const handleStaffChange = (staffId: string) => {
    const staff = staffOptions.find(s => s.id === staffId);
    setFormData(prev => ({
      ...prev,
      staffId,
      staffName: staff?.name || '',
    }));
  };

  const calculateNetSalary = () => {
    const income = formData.baseSalary + formData.overtimePay + formData.bonuses;
    const deductions = formData.deductions + formData.lateDeductions +
      formData.absenceDeductions + formData.socialSecurity +
      formData.housingFund + formData.personalTax;
    return Math.max(0, income - deductions);
  };

  const handleSubmit = () => {
    if (!formData.staffId || !formData.staffName) {
      showAlert('请选择员工');
      return;
    }
    const netSalary = calculateNetSalary();
    onConfirm({
      ...formData,
      netSalary,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 员工选择 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">员工</Label>
            <select
              value={formData.staffId}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择员工</option>
              {staffOptions.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>

          {/* 月份 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">月份</Label>
            <input
              type="month"
              value={formData.month}
              onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 计算方式 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">计算方式</Label>
            <select
              value={formData.calcType}
              onChange={(e) => setFormData(prev => ({ ...prev, calcType: e.target.value as SalaryCalcType }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {calcTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* 状态 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as SalaryStatus }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* 基本工资 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">基本工资</Label>
            <NumberInput
              value={formData.baseSalary}
              onChange={(val) => setFormData(prev => ({ ...prev, baseSalary: Number(val) }))}
              placeholder="0"
              decimals={2}
            />
          </div>

          {/* 加班费 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">加班费</Label>
            <NumberInput
              value={formData.overtimePay}
              onChange={(val) => setFormData(prev => ({ ...prev, overtimePay: Number(val) }))}
              placeholder="0"
              decimals={2}
            />
          </div>

          {/* 奖金 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">奖金</Label>
            <NumberInput
              value={formData.bonuses}
              onChange={(val) => setFormData(prev => ({ ...prev, bonuses: Number(val) }))}
              placeholder="0"
              decimals={2}
            />
          </div>

          {/* 扣款 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">扣款</Label>
            <NumberInput
              value={formData.deductions}
              onChange={(val) => setFormData(prev => ({ ...prev, deductions: Number(val) }))}
              placeholder="0"
              decimals={2}
            />
          </div>

          {/* 迟到扣款 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">迟到扣款</Label>
            <NumberInput
              value={formData.lateDeductions}
              onChange={(val) => setFormData(prev => ({ ...prev, lateDeductions: Number(val) }))}
              placeholder="0"
              decimals={2}
            />
          </div>

          {/* 缺勤扣款 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">缺勤扣款</Label>
            <NumberInput
              value={formData.absenceDeductions}
              onChange={(val) => setFormData(prev => ({ ...prev, absenceDeductions: Number(val) }))}
              placeholder="0"
              decimals={2}
            />
          </div>

          {/* 社保 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">社保</Label>
            <NumberInput
              value={formData.socialSecurity}
              onChange={(val) => setFormData(prev => ({ ...prev, socialSecurity: Number(val) }))}
              placeholder="0"
              decimals={2}
            />
          </div>

          {/* 公积金 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">公积金</Label>
            <NumberInput
              value={formData.housingFund}
              onChange={(val) => setFormData(prev => ({ ...prev, housingFund: Number(val) }))}
              placeholder="0"
              decimals={2}
            />
          </div>

          {/* 个税 */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">个税</Label>
            <NumberInput
              value={formData.personalTax}
              onChange={(val) => setFormData(prev => ({ ...prev, personalTax: Number(val) }))}
              placeholder="0"
              decimals={2}
            />
          </div>

          {/* 实发工资（只读） */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">实发工资</Label>
            <div className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-gray-100 flex items-center text-emerald-600 font-semibold">
              ¥{calculateNetSalary().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default SalaryFormModal;