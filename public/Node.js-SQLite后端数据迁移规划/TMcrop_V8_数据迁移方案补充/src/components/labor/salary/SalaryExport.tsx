import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import type { SalaryRecord } from './types';

interface SalaryExportProps {
  record: SalaryRecord | null;
  open: boolean;
  onClose: () => void;
}

export function SalaryExport({ record, open, onClose }: SalaryExportProps) {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [isExporting, setIsExporting] = useState(false);

  if (!open || !record) return null;

  // 计算工资明细
  const calculateDetails = () => {
    const grossSalary = record.baseSalary + record.overtimePay + record.bonuses;
    const totalDeductions = record.deductions + record.lateDeductions + record.absenceDeductions + record.socialSecurity + record.housingFund + record.personalTax;
    const netSalary = grossSalary - totalDeductions;

    return {
      grossSalary,
      totalDeductions,
      netSalary,
    };
  };

  const { grossSalary, totalDeductions, netSalary } = calculateDetails();

  // 导出Excel
  const exportToExcel = () => {
    setIsExporting(true);

    // 模拟导出延迟
    setTimeout(() => {
      // 创建CSV格式的数据（简化实现，实际应使用xlsx库）
      const csvContent = [
        ['工资条明细'],
        [''],
        ['姓名', record.staffName],
        ['工号', record.staffId],
        ['月份', record.month],
        [''],
        ['应发工资'],
        ['基本工资', record.baseSalary.toFixed(2)],
        ['加班费', record.overtimePay.toFixed(2)],
        ['奖金', record.bonuses.toFixed(2)],
        ['应发合计', grossSalary.toFixed(2)],
        [''],
        ['扣款'],
        ['一般扣款', record.deductions.toFixed(2)],
        ['迟到扣款', record.lateDeductions.toFixed(2)],
        ['缺勤扣款', record.absenceDeductions.toFixed(2)],
        ['社保', record.socialSecurity.toFixed(2)],
        ['公积金', record.housingFund.toFixed(2)],
        ['个税', record.personalTax.toFixed(2)],
        ['扣款合计', totalDeductions.toFixed(2)],
        [''],
        ['实发工资', netSalary.toFixed(2)],
      ].map(row => row.join(',')).join('\n');

      // 创建下载
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `工资条_${record.staffName}_${record.month}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      onClose();
    }, 1000);
  };

  // 导出PDF（模拟实现）
  const exportToPdf = () => {
    setIsExporting(true);

    setTimeout(() => {
      // 模拟PDF导出（实际应使用jspdf等库）
      alert('PDF导出功能需要集成jspdf库，请确认是否安装');
      setIsExporting(false);
      onClose();
    }, 1000);
  };

  // 处理导出
  const handleExport = () => {
    if (exportFormat === 'excel') {
      exportToExcel();
    } else {
      exportToPdf();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">导出工资条</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 员工信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">姓名:</span>
                <span className="ml-2 font-medium">{record.staffName}</span>
              </div>
              <div>
                <span className="text-gray-500">工号:</span>
                <span className="ml-2 font-medium">{record.staffId}</span>
              </div>
              <div>
                <span className="text-gray-500">月份:</span>
                <span className="ml-2 font-medium">{record.month}</span>
              </div>
              <div>
                <span className="text-gray-500">状态:</span>
                <span className="ml-2 font-medium">{record.status}</span>
              </div>
            </div>
          </div>

          {/* 工资预览 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2 border-b">
              <h3 className="font-medium text-emerald-800">工资明细预览</h3>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">基本工资</span>
                <span>¥{record.baseSalary.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">加班费</span>
                <span>¥{record.overtimePay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">奖金</span>
                <span>¥{record.bonuses.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>应发合计</span>
                <span className="text-emerald-600">¥{grossSalary.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>扣款合计</span>
                <span>-¥{totalDeductions.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>实发工资</span>
                <span className="text-emerald-600">¥{netSalary.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 导出格式选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择导出格式</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat('excel')}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  exportFormat === 'excel'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${exportFormat === 'excel' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <p className={`text-sm font-medium ${exportFormat === 'excel' ? 'text-emerald-700' : 'text-gray-700'}`}>
                  Excel
                </p>
                <p className="text-xs text-gray-500">.xlsx 格式</p>
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  exportFormat === 'pdf'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className={`w-8 h-8 mx-auto mb-2 ${exportFormat === 'pdf' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <p className={`text-sm font-medium ${exportFormat === 'pdf' ? 'text-emerald-700' : 'text-gray-700'}`}>
                  PDF
                </p>
                <p className="text-xs text-gray-500">.pdf 格式</p>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>
    </div>
  );
}
