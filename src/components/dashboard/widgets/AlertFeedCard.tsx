/**
 * 基地总览 - 最新告警卡片（2026-10-11 新增：填充右列底部空白，与左列底部对齐）
 * 数据：useAlertStore → GET /api/alerts（真实告警数据，与"告警数量"卡片、预警信息中心同源）
 * 展示最新 4 条告警，点击"查看全部"跳预警信息中心
 */
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { useAlertStore } from '../../../stores/alertStore';

/** 告警级别 → 中文徽章（info/warning/error/critical） */
const ALERT_LEVEL_MAP: Record<string, { label: string; cls: string }> = {
  critical: { label: '严重', cls: 'bg-red-600 text-white' },
  error: { label: '异常', cls: 'bg-red-100 text-red-700' },
  warning: { label: '警告', cls: 'bg-amber-100 text-amber-700' },
  info: { label: '提示', cls: 'bg-blue-100 text-blue-600' },
};

/** 创建时间 → MM-DD HH:mm（容错解析） */
function formatAlertTime(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AlertFeedCard() {
  const navigate = useNavigate();
  const alerts = useAlertStore((s) => s.alerts);
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // 最新 4 条（未处理的排前面）
  const latestAlerts = useMemo(() => {
    return alerts
      .slice()
      .sort((a, b) => {
        const aPending = a.status === 'pending' ? 0 : 1;
        const bPending = b.status === 'pending' ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      })
      .slice(0, 4);
  }, [alerts]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-500" />
          最新告警
        </h3>
        <button
          type="button"
          onClick={() => navigate('/alert-info')}
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          查看全部 <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {latestAlerts.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400">暂无告警</div>
      ) : (
        <div className="space-y-3">
          {latestAlerts.map((a) => {
            const levelCfg = ALERT_LEVEL_MAP[a.level] || { label: a.level || '-', cls: 'bg-gray-100 text-gray-600' };
            return (
              <div key={a.id} className="flex items-start gap-2.5">
                <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${levelCfg.cls}`}>{levelCfg.label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate" title={a.message || a.title}>
                    {a.title || a.message || '-'}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 truncate">{(a as any).greenhouseName || (a as any).sourceName || ''}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatAlertTime((a as any).createdAt || a.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
