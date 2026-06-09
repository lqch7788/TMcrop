import { AlertTriangle, X } from 'lucide-react';
import type { Contract } from './types';
import { Button, UnifiedModal } from '@/components/ui';

interface ContractRemindModalProps {
  expiringContracts: Contract[];
  open: boolean;
  onClose: () => void;
}

export function ContractRemindModal({ expiringContracts, open, onClose }: ContractRemindModalProps) {
  // 计算距离到期天数
  const getDaysUntilExpiry = (endDate: string): number => {
    const today = new Date();
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <UnifiedModal isOpen={open} onClose={onClose} title="合同到期提醒" size="lg" showFooter={false}>
      {expiringContracts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">暂无30天内到期的合同</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {expiringContracts.map((contract) => {
            const daysLeft = getDaysUntilExpiry(contract.endDate);
            return (
              <div
                key={contract.id}
                className={`p-4 border rounded-lg ${
                  daysLeft <= 7 ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{contract.staffName}</p>
                    <p className="text-sm text-gray-500">{contract.contractCode}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                        daysLeft <= 7
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {daysLeft <= 7 ? '紧急' : `${daysLeft}天后到期`}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">到期: {contract.endDate}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <p className="text-sm">
                    <span className="text-gray-500">合同类型:</span> {contract.contractType}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-end mt-4 pt-4 border-t">
        <Button variant="secondary" onClick={onClose}>
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>
    </UnifiedModal>
  );
}
