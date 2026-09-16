/**
 * 班组详情弹窗（2026-09-15：扩展为 Tab 化，集成 Phase 2 新能力）
 *
 * Tab：
 *  - 基本信息：原 Team 字段 + capabilityTags + capacity + coverage
 *  - 成员：原成员列表（基于 memberIds 反查名字）
 *  - 作业区域（#1）：zone_assignments 列表 + 增删
 *  - 任务能力（#3）：task_capabilities 列表 + 增删
 *  - 变更历史（#7）：member-changes 时间线
 *  - 可用性（#8）：指定日期可用工时
 */
import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Badge, Button, Input, UnifiedModal } from '@/components/ui';
import type { Team } from './types';
import { getWorkerName, useTeamManageStore } from '@/stores/useTeamManageStore';

interface TeamDetailModalProps {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}

type DetailTab = 'basic' | 'members' | 'zones' | 'capabilities' | 'changes' | 'availability';

export function TeamDetailModal({ open, onClose, team }: TeamDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('basic');
  const [zoneInput, setZoneInput] = useState('');
  const [capInput, setCapInput] = useState('');
  const [availDate, setAvailDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchZones = useTeamManageStore((s) => s.fetchZones);
  const addZone = useTeamManageStore((s) => s.addZone);
  const removeZone = useTeamManageStore((s) => s.removeZone);
  const fetchCapabilities = useTeamManageStore((s) => s.fetchCapabilities);
  const addCapability = useTeamManageStore((s) => s.addCapability);
  const removeCapability = useTeamManageStore((s) => s.removeCapability);
  const fetchMemberChanges = useTeamManageStore((s) => s.fetchMemberChanges);
  const fetchAvailability = useTeamManageStore((s) => s.fetchAvailability);

  const [zones, setZones] = useState<Array<{ id: string; zone_id: string; role: string }>>([]);
  const [caps, setCaps] = useState<Array<{ id: string; task_type: string }>>([]);
  const [changes, setChanges] = useState<Array<{
    id: string; worker_id: string; change_type: string;
    operator_name: string | null; reason: string | null; created_at: string;
  }>>([]);
  const [avail, setAvail] = useState<{
    available_hours: number; busy_hours: number; total_worker_count: number;
  } | null>(null);

  // 打开弹窗时刷新数据
  useEffect(() => {
    if (!open || !team) return;
    let cancelled = false;
    void (async () => {
      const [z, c, ch] = await Promise.all([
        fetchZones(team.id),
        fetchCapabilities(team.id),
        fetchMemberChanges(team.id, 30),
      ]);
      if (cancelled) return;
      setZones(z.map((x) => ({ id: x.id, zone_id: x.zone_id, role: x.role })));
      setCaps(c.map((x) => ({ id: x.id, task_type: x.task_type })));
      setChanges(ch.map((x) => ({
        id: x.id, worker_id: x.worker_id, change_type: x.change_type,
        operator_name: x.operator_name, reason: x.reason, created_at: x.created_at,
      })));
    })();
    return () => { cancelled = true; };
  }, [open, team, fetchZones, fetchCapabilities, fetchMemberChanges]);

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
    { id: 'zones', label: `作业区域 (${zones.length})` },
    { id: 'capabilities', label: `任务能力 (${caps.length})` },
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
      {/* Tab 切换 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'basic' && (
        <div className="space-y-3">
          <Field label="班长" value={team.leaderName || '未设置'} />
          <Field label="成员数量" value={`${team.memberCount} 人`} />
          <Field label="作业区域(主)" value={team.workZone || '-'} />
          <Field label="技能标签(班组)" value={
            team.capabilityTags?.length ? (
              <div className="flex flex-wrap gap-1">
                {team.capabilityTags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            ) : '—'
          } />
          <Field label="日产能上限" value={`${team.dailyCapacityHours ?? 8} 小时/天`} />
          <Field label="周产能上限" value={`${team.weeklyCapacityHours ?? 40} 小时/周`} />
          <Field label="作业半径" value={`${team.coverageRadiusKm ?? 0} 公里（0=不限）`} />
          {team.description && <Field label="班组描述" value={team.description} />}
        </div>
      )}

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

      {activeTab === 'zones' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={zoneInput}
              onChange={(e) => setZoneInput(e.target.value)}
              placeholder="输入作业区域 ID（如 zone_001）"
              className="flex-1"
            />
            <Button size="sm" onClick={async () => {
              if (!zoneInput.trim()) return;
              await addZone(team.id, zoneInput.trim(), 'allowed');
              setZoneInput('');
              setZones(await fetchZones(team.id).then((arr) => arr.map((x) => ({ id: x.id, zone_id: x.zone_id, role: x.role }))));
            }}>
              <Plus className="w-4 h-4" /> 添加
            </Button>
          </div>
          {zones.length > 0 ? (
            <div className="space-y-1">
              {zones.map((z) => (
                <div key={z.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm text-gray-900">{z.zone_id}</span>
                    <Badge variant={z.role === 'primary' ? 'default' : 'secondary'} className="ml-2">{z.role}</Badge>
                  </div>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    await removeZone(team.id, z.zone_id, z.role);
                    setZones(await fetchZones(team.id).then((arr) => arr.map((x) => ({ id: x.id, zone_id: x.zone_id, role: x.role }))));
                  }}>
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">暂无作业区域</p>
          )}
        </div>
      )}

      {activeTab === 'capabilities' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={capInput}
              onChange={(e) => setCapInput(e.target.value)}
              placeholder="输入任务类型（如 采收 / 施肥 / 打药 / 巡检 / 灌溉）"
              className="flex-1"
            />
            <Button size="sm" onClick={async () => {
              if (!capInput.trim()) return;
              await addCapability(team.id, capInput.trim());
              setCapInput('');
              setCaps(await fetchCapabilities(team.id).then((arr) => arr.map((x) => ({ id: x.id, task_type: x.task_type }))));
            }}>
              <Plus className="w-4 h-4" /> 添加
            </Button>
          </div>
          {caps.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {caps.map((c) => (
                <div key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded">
                  <span className="text-sm text-blue-800">{c.task_type}</span>
                  <button onClick={async () => {
                    await removeCapability(team.id, c.task_type);
                    setCaps(await fetchCapabilities(team.id).then((arr) => arr.map((x) => ({ id: x.id, task_type: x.task_type }))));
                  }}>
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">暂无任务能力</p>
          )}
        </div>
      )}

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

      {activeTab === 'availability' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">日期：</span>
            <Input type="date" value={availDate} onChange={(e) => setAvailDate(e.target.value)} className="w-40" />
          </div>
          {avail ? (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="可用工时" value={`${avail.available_hours}h`} color="green" />
              <Stat label="已排工时" value={`${avail.busy_hours}h`} color="orange" />
              <Stat label="总成员数" value={`${avail.total_worker_count} 人`} />
              <Stat label="利用率" value={avail.total_worker_count > 0 ? `${Math.round(avail.busy_hours / (avail.total_worker_count * 8) * 100)}%` : '—'} />
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
