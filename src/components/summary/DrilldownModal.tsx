/**
 * 下钻明细弹窗
 *
 * 点击看板上的待办项 / 未达标指标后，展示数字背后的具体记录清单，并可一键跳到对应模块处理。
 * 解决此前"看得见总数、不知道是哪几条、动不了"的断点。
 */

import { useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2, Inbox } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { DrilldownData } from '../../stores/useSummaryDataStore';

export interface DrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 明细数据（含标题与记录行） */
  data: DrilldownData | null;
  loading?: boolean;
}

export function DrilldownModal({ isOpen, onClose, data, loading }: DrilldownModalProps) {
  const navigate = useNavigate();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={data ? `${data.title}（共 ${data.total} 条）` : '明细'}
      size="lg"
      showFooter={false}
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Inbox className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">没有需要处理的记录</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {data.rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 px-1 py-3 hover:bg-gray-50/70 transition-colors rounded"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 truncate" title={row.title}>{row.title}</div>
                <div className="text-xs text-gray-400 truncate mt-0.5" title={row.meta}>{row.meta}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex-shrink-0">
                {row.status}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-blue-600 flex-shrink-0"
                title="前往对应模块处理"
                onClick={() => {
                  navigate(row.path);
                  onClose();
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default DrilldownModal;
