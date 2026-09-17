/**
 * 班组详情弹窗（2026-09-16：纯只读）
 *
 * 设计：详情 = 查看，不允许任何编辑操作。区域/能力等子资源在编辑 Modal 中管理。
 *
 * Tab：
 *  - 基本信息：原 Team 字段 + capabilityTags + capacity + coverage
 *  - 成员：原成员列表（基于 memberIds 反查名字）
 *  - 变更历史（#7）：member-changes 时间线
 *  - 可用性（#8）：指定日期可用工时
 */
import { useEffect, useState } from 'react';
import { Badge, UnifiedModal } from '@/components/ui';
import type { Team } from './types';
import { getWorkerName, useTeamManageStore } from '@/stores/useTeamManageStore';

interface TeamDetailModalProps {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}

type DetailTab = 'basic' | 'members' | 'changes' | 'availability';

export function TeamDetailModal({ open, onClose, team }: TeamDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('basic');
  const [availDate, setAvailDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchMemberChanges = useTeamManageStore((s) => s.fetchMemberChanges);
  const fetchAvailability = useTeamManageStore((s) => s.fetchAvailability);

  const [changes, setChanges] = useState<Array<{
    id: string; worker_id: string; change_type: string;
    operator_name: string | null; reason: string | null; created_at: string;
  }>>([]);
  const [avail, setAvail] = useState<{
    available_hours: number; busy_hours: number; total_worker_count: number;
  } | null>(null);

  // 打开弹窗时刷新变更历史
  useEffect(() => {
    if (!open || !team) return;
    let cancelled = false;
    void (async () => {
      const ch = await fetchMemberChanges(team.id, 30);
      if (cancelled) return;
      setChanges(ch.map((x) => ({
        id: x.id, worker_id: x.worker_id, change_type: x.change_type,
        operator_name: x.operator_name, reason: x.reason, created_at: x.created_at,
      })));
    })();
    return () => { cancelled = true; };
  }, [open, team, fetchMemberChanges]);

  // 切到可用性 Tab 时加载
  useEffect(() => {
    if (activeTab === 'availability' && team && availDate) {
      void fetchAvailability(team.id, availDate).then((a) => {
        if (a) setAvail({
          available_hours: a.available_hours,
          busy_hours: a.busy_hours,
          total_worker_count: a.total_worker_count,
        });
        else setAvail(null);
      });
    }
  }, [activeTab, team, availDate, fetchAvailability]);

  if (!open || !team) return null;

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'basic', label: '基本信息' },
    { id: 'members', label: `成员 (${team.memberIds.length})` },
    { id: 'changes', label: `变更历史 (${changes.length})` },
    { id: 'availability', label: '可用性' },
  ];

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={`班组详情 - ${team.name}`}
      size="xxxl"
      width={1200}
      showFooter={false}
    >
      {/* Tab 切换（2026-09-16：粗体 + 选中蓝色背景） */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 基本信息 - 2026-09-16：3 列布局 */}
      {activeTab === 'basic' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="班长" value={team.leaderName || '未设置'} />
            <Field label="成员数量" value={`${team.memberCount} 人`} />
            {/* 2026-09-17：作业区域界面已下线（数据保留在 team_zone_assignments 表） */}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">技能标签(班组)</label>
            {team.capabilityTags?.length ? (
              <div className="flex flex-wrap gap-1">
                {team.capabilityTags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            ) : <span className="text-gray-400 text-sm">—</span>}
          </div>
          {/* 2026-09-17：移除周产能/作业半径展示（项目内无任何下游消费的死字段） */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="日产能上限" value={`${team.dailyCapacityHours ?? 8} 小时/人/天`} />
          </div>
          {team.description && <Field label="班组描述" value={team.description} />}
          {/* 2026-09-16：明确提示子资源去编辑入口修改 */}
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 mt-4">
            💡 区域/任务能力等子资源请通过「编辑班组」弹窗修改（点行操作列「编辑」图标）
          </div>
        </div>
      )}

      {/* 成员 */}
      {activeTab === 'members' && (
        <div className="space-y-2">
          {team.memberIds && team.memberIds.length > 0 ? (
            team.memberIds.map((memberId) => (
              <div key={memberId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-900">{getWorkerName(memberId)}</span>
                <Badge variant="secondary">组员</Badge>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">暂无成员</p>
          )}
        </div>
      )}

      {/* 变更历史 */}
      {activeTab === 'changes' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {changes.length > 0 ? changes.map((c) => (
            <div key={c.id} className="p-2 bg-gray-50 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">{getWorkerName(c.worker_id)} · {c.change_type}</span>
                <span className="text-gray-400">{c.created_at}</span>
              </div>
              <div className="text-gray-500">
                操作人：{c.operator_name || '系统'} {c.reason ? `· 原因：${c.reason}` : ''}
              </div>
            </div>
          )) : (
            <p className="text-gray-400 text-sm text-center py-4">暂无变更记录</p>
          )}
        </div>
      )}

      {/* 可用性 */}
      {activeTab === 'availability' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">日期：</span>
            <input type="date" value={availDate} onChange={(e) => setAvailDate(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
            <div className="font-medium mb-1">📊 字段含义</div>
            <div><strong>可用工时</strong> = 班组当日剩余可承接任务的小时数</div>
            <div><strong>已排工时</strong> = 班组所有成员当日排班占用的总小时数</div>
            <div><strong>总成员数</strong> = 班组当前在职成员人数</div>
            <div><strong>利用率</strong> = 已排工时 / (总成员数 × 8h)</div>
          </div>
          {avail ? (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="可用工时（剩余可派工时）" value={`${avail.available_hours ?? 0}h`} color="green" />
              <Stat label="已排工时（占用的工时）" value={`${avail.busy_hours ?? 0}h`} color="orange" />
              <Stat label="总成员数" value={`${avail.total_worker_count ?? 0} 人`} />
              <Stat
                label="利用率"
                value={
                  (avail.total_worker_count ?? 0) > 0
                    ? `${Math.round(((avail.busy_hours ?? 0) / (avail.total_worker_count * 8)) * 100)}%`
                    : '—'
                }
              />
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">该日期无排班数据</p>
          )}
        </div>
      )}
    </UnifiedModal>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <label className="text-xs text-gray-500 block">{label}</label>
      <div className="font-medium text-gray-900 mt-1 text-sm">{value}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: 'green' | 'orange' }) {
  const cls = color === 'green' ? 'text-green-600' : color === 'orange' ? 'text-orange-600' : 'text-gray-900';
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <label className="text-xs text-gray-500 block">{label}</label>
      <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}

export default TeamDetailModal;
