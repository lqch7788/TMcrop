/**
 * 运营透视面板 - 结构分析
 *
 * 三块回答管理者最关心的三个问题：
 *   ① 物料去向 —— 领出去的东西都用到哪了（调拨/领用/损耗/赠样/销售）
 *   ② 审批瓶颈 —— 哪类单据最占审批资源（条数最多的就是瓶颈）
 *   ③ 人员负荷 —— 任务是否压在少数人身上
 *
 * 数据来自 GET /api/summary/indicator-board 的 structure 字段，不额外请求。
 */

import { ReactNode } from 'react';
import { ArrowRightLeft, FileCheck, Users, Package } from 'lucide-react';
import type { BoardStructure } from '../../stores/useSummaryDataStore';

export interface OperationsPerspectiveProps {
  structure: BoardStructure | null;
}

/** 单行：标签 + 进度条 + 数值 */
function BarRow({
  label, value, max, unit = '', extra, colorClass = 'bg-blue-500', title,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  /** 数值后的小字（如"待审 3"） */
  extra?: ReactNode;
  colorClass?: string;
  title?: string;
}) {
  const width = max > 0 ? Math.max(Math.round((value / max) * 100), 2) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-20 truncate flex-shrink-0" title={title || label}>{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-0">
        <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-700 flex-shrink-0 tabular-nums">
        {value.toLocaleString()}{unit}
      </span>
      {extra}
    </div>
  );
}

/** 卡片容器 */
function PanelCard({
  title, icon, hint, children,
}: {
  title: string;
  icon: ReactNode;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center">{icon}</div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">{hint}</p>
      {children}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-gray-400">{text}</div>;
}

export function OperationsPerspective({ structure }: OperationsPerspectiveProps) {
  if (!structure) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">暂无结构数据</p>
      </div>
    );
  }

  const { materialFlow, approvalByType, workload } = structure;

  // 进度条以"最大值"为满格，突出排在最前的项
  const maxFlow = Math.max(...materialFlow.map((f) => f.count), 1);
  const maxApproval = Math.max(...approvalByType.map((a) => a.count), 1);
  const maxWork = Math.max(...workload.map((w) => w.total), 1);

  const totalTasks = workload.reduce((s, w) => s + w.total, 0);
  const topLoad = workload[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ① 物料去向 */}
      <PanelCard
        title="物料去向"
        icon={<ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />}
        hint="出库流水的业务类型分布，条数最多的即主要流向"
      >
        {materialFlow.length === 0 ? (
          <EmptyHint text="所选区间内没有出库记录" />
        ) : (
          <div className="space-y-3">
            {materialFlow.map((f) => (
              <BarRow
                key={f.type || f.label}
                label={f.label}
                title={`${f.label}（${f.type || '未分类'}）`}
                value={f.count}
                max={maxFlow}
                unit=" 次"
                colorClass="bg-blue-500"
                extra={
                  f.quantity !== 0 ? (
                    // 出库数量在流水里记为负数，取绝对值更符合阅读习惯
                    <span className="text-xs text-gray-400 w-20 text-right flex-shrink-0 tabular-nums">
                      {Math.abs(f.quantity).toLocaleString()}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </PanelCard>

      {/* ② 审批瓶颈 */}
      <PanelCard
        title="审批瓶颈"
        icon={<FileCheck className="w-3.5 h-3.5 text-purple-600" />}
        hint="按单据类型统计，条数最多的类型最占用审批资源"
      >
        {approvalByType.length === 0 ? (
          <EmptyHint text="所选区间内没有审批单据" />
        ) : (
          <div className="space-y-3">
            {approvalByType.map((a) => (
              <BarRow
                key={a.type || a.label}
                label={a.label}
                title={`${a.label}（${a.type || '未知'}）`}
                value={a.count}
                max={maxApproval}
                unit=" 单"
                colorClass="bg-purple-500"
                extra={
                  a.pending > 0 ? (
                    <span className="text-xs text-amber-600 w-20 text-right flex-shrink-0">
                      待审 {a.pending}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 w-20 text-right flex-shrink-0">—</span>
                  )
                }
              />
            ))}
          </div>
        )}
      </PanelCard>

      {/* ③ 人员负荷（独占一行） */}
      <div className="lg:col-span-2">
        <PanelCard
          title="人员负荷"
          icon={<Users className="w-3.5 h-3.5 text-emerald-600" />}
          hint={
            totalTasks > 0 && topLoad
              ? `所选区间共 ${totalTasks} 个任务；${topLoad.name} 承担 ${topLoad.total} 个（占 ${Math.round((topLoad.total / totalTasks) * 100)}%）`
              : '按负责人统计任务条数，用于识别负荷是否集中'
          }
        >
          {workload.length === 0 ? (
            <EmptyHint text="所选区间内没有指派给具体人员的任务" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {workload.map((w) => (
                <BarRow
                  key={w.name}
                  label={w.name}
                  value={w.total}
                  max={maxWork}
                  unit=" 个"
                  colorClass={w.total === maxWork && workload.length > 1 ? 'bg-amber-500' : 'bg-emerald-500'}
                  extra={
                    <span className="text-xs text-gray-400 w-20 text-right flex-shrink-0">
                      完成 {w.completed}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

export default OperationsPerspective;
