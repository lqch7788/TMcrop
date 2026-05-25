/**
 * 班组详情弹窗
 * 显示班组基本信息（名称、班长、成员数量、描述、作业区域）
 * 由于实际 Team 类型只有 memberIds (字符串数组)，成员详情需通过 memberIds 后续查询获取
 */
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import type { Team } from './types';
import { getWorkerName } from '@/stores/useTeamManageStore';

// TeamDetailModal 接收真实的 Team 类型
interface TeamDetailModalProps {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}

export function TeamDetailModal({ open, onClose, team }: TeamDetailModalProps) {
  if (!team) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`班组详情 - ${team.name}`}
    >
      <div className="space-y-4">
        {/* 班长 */}
        <div>
          <label className="text-sm text-gray-500">班长</label>
          <p className="font-medium">{team.leaderName || '未设置'}</p>
        </div>

        {/* 成员数量 */}
        <div>
          <label className="text-sm text-gray-500">成员数量</label>
          <p className="font-medium">{team.memberCount || 0} 人</p>
        </div>

        {/* 成员ID列表 */}
        <div>
          <label className="text-sm text-gray-500 mb-2 block">成员ID列表</label>
          <div className="space-y-2">
            {team.memberIds && team.memberIds.length > 0 ? (
              team.memberIds.map((memberId, index) => (
                <div key={memberId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">{getWorkerName(memberId)}</span>
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
          <div>
            <label className="text-sm text-gray-500">作业区域</label>
            <p className="font-medium">{team.workZone}</p>
          </div>
        )}

        {/* 班组描述 */}
        {team.description && (
          <div>
            <label className="text-sm text-gray-500">班组描述</label>
            <p className="font-medium">{team.description}</p>
          </div>
        )}

        {/* 技能标签 - 占位提示 */}
        <div>
          <label className="text-sm text-gray-500 mb-2 block">技能标签</label>
          <div className="flex flex-wrap gap-2">
            <span className="text-gray-400 text-sm">待定（需关联工人技能数据）</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TeamDetailModal;
