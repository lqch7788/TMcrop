import React, { useState } from 'react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { AlertTriangle, AlertCircle, AlertOctagon, Clock, CheckCircle, User, Building } from 'lucide-react';
import type { RiskAlert, AlertLevel } from './types';
import { AlertLevelNames } from './types';

interface RiskAlertDetailModalProps {
  alert: RiskAlert | null;
  open: boolean;
  onClose: () => void;
  onHandle: (alertId: string, remarks: string) => void;
}

// 预警等级样式配置
const levelStyles: Record<AlertLevel, { icon: React.ReactNode; variant: 'warning' | 'destructive'; className: string }> = {
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    variant: 'warning',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  danger: {
    icon: <AlertCircle className="w-5 h-5" />,
    variant: 'destructive',
    className: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  critical: {
    icon: <AlertOctagon className="w-5 h-5" />,
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
};

export function RiskAlertDetailModal({ alert, open, onClose, onHandle }: RiskAlertDetailModalProps) {
  const [remarks, setRemarks] = useState('');

  if (!alert) return null;

  const style = levelStyles[alert.level];

  const handleSubmit = () => {
    if (remarks.trim()) {
      onHandle(alert.id, remarks.trim());
      setRemarks('');
      onClose();
    }
  };

  const handleClose = () => {
    setRemarks('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant={style.variant} className={style.className}>
              <span className="flex items-center gap-1">
                {style.icon}
                {AlertLevelNames[alert.level]}
              </span>
            </Badge>
            <span className="ml-2">{alert.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 预警类型 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">预警类型：</span>
            <span className="font-medium">{alert.alertTypeName}</span>
          </div>

          {/* 预警内容 */}
          <div>
            <p className="text-sm text-gray-500 mb-1">预警内容</p>
            <p className="bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">{alert.content}</p>
          </div>

          {/* 关联信息 */}
          {(alert.staffName || alert.department) && (
            <div className="grid grid-cols-2 gap-4">
              {alert.department && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">部门：</span>
                  <span className="font-medium">{alert.department}</span>
                </div>
              )}
              {alert.staffName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">人员：</span>
                  <span className="font-medium">{alert.staffName}</span>
                  {alert.staffId && <span className="text-gray-400">({alert.staffId})</span>}
                </div>
              )}
            </div>
          )}

          {/* 时间信息 */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">创建时间：</span>
            <span className="font-medium">{alert.createTime}</span>
          </div>

          {/* 处理状态 */}
          <div className="flex items-center gap-2 text-sm">
            {alert.status === 'pending' ? (
              <>
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-orange-600">待处理</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600">已处理</span>
                {alert.handleTime && (
                  <span className="text-gray-500 ml-2">处理时间：{alert.handleTime}</span>
                )}
                {alert.handler && (
                  <span className="text-gray-500 ml-2">处理人：{alert.handler}</span>
                )}
              </>
            )}
          </div>

          {/* 已处理备注 */}
          {alert.remarks && (
            <div>
              <p className="text-sm text-gray-500 mb-1">处理备注</p>
              <p className="bg-green-50 p-3 rounded-lg text-sm leading-relaxed text-green-800">
                {alert.remarks}
              </p>
            </div>
          )}

          {/* 处理备注输入（仅待处理状态显示） */}
          {alert.status === 'pending' && (
            <div className="space-y-2">
              <Label htmlFor="remarks">处理备注</Label>
              <Input
                id="remarks"
                placeholder="请输入处理备注..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose}>
            {alert.status === 'pending' ? '稍后处理' : '关闭'}
          </Button>
          {alert.status === 'pending' && (
            <Button onClick={handleSubmit} disabled={!remarks.trim()}>
              标记已处理
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
