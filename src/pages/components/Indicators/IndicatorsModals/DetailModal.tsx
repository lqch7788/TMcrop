/**
 * 指标详情/分析/评价弹窗组件
 * 用于查看指标详情、达成分析、考核评价
 */
import { Eye, Target, Award } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Modal } from '../../../../components/ui/Modal';
import type { Indicator, ModalType } from '../../../types/indicators.types';
import { getProgressColor, calcAchievementRate } from '../../../hooks/useIndicators';

interface DetailModalProps {
  isOpen: boolean;
  indicator: Indicator | null;
  modalType: ModalType;
  onClose: () => void;
}

// 获取弹窗标题
function getModalTitle(type: ModalType): { icon: JSX.Element; text: string } {
  switch (type) {
    case 'view':
      return { icon: <Eye className="w-5 h-5" />, text: '指标详情' };
    case 'analyze':
      return { icon: <Target className="w-5 h-5" />, text: '达成分析' };
    case 'evaluate':
      return { icon: <Award className="w-5 h-5" />, text: '考核评价' };
    default:
      return { icon: <Eye className="w-5 h-5" />, text: '指标详情' };
  }
}

export default function DetailModal({ isOpen, indicator, modalType, onClose }: DetailModalProps) {
  const titleInfo = getModalTitle(modalType);

  // 底部按钮
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button size="sm" variant="secondary" onClick={onClose}>关闭</Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleInfo.text}
      size="lg"
      showFooter={true}
      footer={footer}
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
    >
      <div className="space-y-4">
        {/* 指标详情视图 */}
        {modalType === 'view' && indicator && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-lg">📊</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">{indicator.name}</h4>
                <span className="text-sm text-gray-500 font-mono">{indicator.code}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">类别</p>
                <p className="text-sm font-medium text-gray-900">{indicator.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">采集方式</p>
                <p className="text-sm font-medium text-gray-900">{indicator.source}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">目标值</p>
                <p className="text-lg font-bold text-blue-600 font-mono">{indicator.target}{indicator.unit}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">实际值</p>
                <p className="text-lg font-bold text-gray-900 font-mono">{indicator.actual}{indicator.unit}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">达成率</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(indicator.actual, indicator.target)} rounded-full`}
                    style={{ width: `${Math.min((indicator.actual / indicator.target) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 font-mono">
                  {calcAchievementRate(indicator.actual, indicator.target)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 达成分析视图 */}
        {modalType === 'analyze' && indicator && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 text-lg">📈</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">{indicator.name}</h4>
                <span className="text-sm text-gray-500 font-mono">{indicator.code}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">目标值</p>
                <p className="text-xl font-bold text-blue-600 font-mono">{indicator.target}{indicator.unit}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">实际值</p>
                <p className="text-xl font-bold text-emerald-600 font-mono">{indicator.actual}{indicator.unit}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">达成率</p>
                <p className="text-xl font-bold text-purple-600 font-mono">{calcAchievementRate(indicator.actual, indicator.target)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 考核评价视图 */}
        {modalType === 'evaluate' && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">本季度考核评价</h4>
                <span className="text-sm text-gray-500">2026年Q2</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">参评基地</p>
                <p className="text-xl font-bold text-blue-600 font-mono">8</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">优秀</p>
                <p className="text-xl font-bold text-emerald-600 font-mono">3</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">良好</p>
                <p className="text-xl font-bold text-blue-600 font-mono">4</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">合格</p>
                <p className="text-xl font-bold text-amber-600 font-mono">1</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
