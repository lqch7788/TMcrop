import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import type { SalaryRecord, SalaryCalcType, SalaryStatus } from './types';

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
      alert('请选择员工');
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
            <label className="block text-sm font-medium text-gray-700 mb-1">员工</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
            <input
              type="month"
              value={formData.month}
              onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 计算方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">计算方式</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">基本工资</label>
            <input
              type="number"
              value={formData.baseSalary || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, baseSalary: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 加班费 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">加班费</label>
            <input
              type="number"
              value={formData.overtimePay || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, overtimePay: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 奖金 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">奖金</label>
            <input
              type="number"
              value={formData.bonuses || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, bonuses: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 扣款 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">扣款</label>
            <input
              type="number"
              value={formData.deductions || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, deductions: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 迟到扣款 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">迟到扣款</label>
            <input
              type="number"
              value={formData.lateDeductions || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, lateDeductions: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 缺勤扣款 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">缺勤扣款</label>
            <input
              type="number"
              value={formData.absenceDeductions || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, absenceDeductions: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 社保 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">社保</label>
            <input
              type="number"
              value={formData.socialSecurity || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, socialSecurity: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 公积金 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">公积金</label>
            <input
              type="number"
              value={formData.housingFund || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, housingFund: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 个税 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">个税</label>
            <input
              type="number"
              value={formData.personalTax || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, personalTax: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          {/* 实发工资（只读） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实发工资</label>
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