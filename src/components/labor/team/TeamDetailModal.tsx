/**
 * 班组详情弹窗
 * 显示班组基本信息（名称、班长、成员数量、描述、作业区域）
 * 由于实际 Team 类型只有 memberIds (字符串数组)，成员详情需通过 memberIds 后续查询获取
 */
import { Badge } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import type { Team } from './types';
import { getWorkerName } from '@/stores/useTeamManageStore';

interface TeamDetailModalProps {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}

export function TeamDetailModal({ open, onClose, team }: TeamDetailModalProps) {
  if (!open || !team) return null;

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={`班组详情 - ${team.name}`}
      size="md"
      showFooter={false}
    >
      <div className="space-y-3">
        {/* 班长 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 block">班长</label>
          <p className="font-medium text-gray-900 mt-1">{team.leaderName || '未设置'}</p>
        </div>

        {/* 成员数量 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 block">成员数量</label>
          <p className="font-medium text-gray-900 mt-1">{team.memberCount || 0} 人</p>
        </div>

        {/* 成员ID列表 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 block mb-2">成员列表</label>
          <div className="space-y-2">
            {team.memberIds && team.memberIds.length > 0 ? (
              team.memberIds.map((memberId) => (
                <div key={memberId} className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="text-sm text-gray-900">{getWorkerName(memberId)}</span>
                  <Badge variant="secondary">组员</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">暂无成员</p>
            )}
          </div>
        </div>

        {/* 作业区域 */}
        {team.workZone && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="text-xs text-gray-500 block">作业区域</label>
            <p className="font-medium text-gray-900 mt-1">{team.workZone}</p>
          </div>
        )}

        {/* 班组描述 */}
        {team.description && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="text-xs text-gray-500 block">班组描述</label>
            <p className="font-medium text-gray-900 mt-1">{team.description}</p>
          </div>
        )}

        {/* 技能标签 - 占位提示 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <label className="text-xs text-gray-500 block mb-2">技能标签</label>
          <div className="flex flex-wrap gap-2">
            <span className="text-gray-400 text-sm">待定（需关联工人技能数据）</span>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}

export default TeamDetailModal;
