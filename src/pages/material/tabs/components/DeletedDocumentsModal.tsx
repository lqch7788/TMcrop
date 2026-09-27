// DeletedDocumentsModal 组件
// 已删除单据归档查询（2026-09-27 审计方案：删除后仍可追溯）
//
// 背景：已发料出库单禁止物理删除（改用"作废"，本体保留）；允许删除的待出库单/申请单
// 删除时整行快照归档到 deleted_documents_archive（永久留存，不受 operation_logs 180 天清理影响）。
// 本弹窗是"虽然不在列表显示、但查得到"的追溯入口：按单号/类型查询已删单据完整快照。
import { useCallback, useEffect, useState } from 'react';
import { Archive, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { enhancedApiClient } from '@/lib/apiClient';

interface ArchivedDoc {
  id: string;
  docType: string;
  docId: string;
  docCode: string;
  snapshot: Record<string, unknown>;
  deletedBy: string | null;
  deletedAt: string;
  reason: string | null;
}

interface DeletedDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 预筛选类型：material_request | material_execute | 空=全部 */
  defaultType?: string;
}

const DOC_TYPE_LABEL: Record<string, string> = {
  material_request: '领料申请单',
  material_execute: '领料出库单',
};

/** 2026-09-27：删除原因显示兜底——过滤历史脏值（事件对象被 toString 的产物） */
function cleanReason(reason: string | null | undefined): string {
  if (!reason || typeof reason !== 'string') return '未填写';
  const t = reason.trim();
  if (!t || t === '[object Object]') return '未填写';
  return t;
}

/** 从快照中提取物料明细（两种单据字段同名 materials/materialCode） */
function snapshotMaterials(snapshot: Record<string, unknown>): any[] {
  const mats = snapshot.materials;
  if (Array.isArray(mats)) return mats;
  if (typeof mats === 'string') {
    try { const p = JSON.parse(mats); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

export function DeletedDocumentsModal({ isOpen, onClose, defaultType }: DeletedDocumentsModalProps) {
  const [code, setCode] = useState('');
  const [type, setType] = useState(defaultType || 'all');
  const [rows, setRows] = useState<ArchivedDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = useCallback(async (searchCode: string, searchType: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchCode.trim()) params.set('code', searchCode.trim());
      if (searchType && searchType !== 'all') params.set('type', searchType);
      const res = await enhancedApiClient.get<ArchivedDoc[]>(`/deleted-documents?${params.toString()}`);
      setRows(Array.isArray(res) ? res : []);
      setSearched(true);
    } catch {
      setRows([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开时重置并默认查询（type 取预筛选值）
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setType(defaultType || 'all');
      setExpandedId(null);
      handleSearch('', defaultType || 'all');
    }
  }, [isOpen, defaultType, handleSearch]);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="已删除单据（归档追溯）"
      size="xxl"
    >
      <div className="space-y-4">
        {/* 说明 */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-2">
          <Archive className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs text-slate-600">
            此处展示已物理删除的申请单/待出库单的完整快照（永久留存）。已出库单据不允许删除，请用「作废」——作废单在列表「已取消」筛选中查看。
          </span>
        </div>

        {/* 查询条件 */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="block text-sm text-gray-600 mb-1">单号</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(code, type); }}
                placeholder="输入单号（支持模糊），回车查询"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="w-44">
            <Label className="block text-sm text-gray-600 mb-1">单据类型</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="material_request">领料申请单</SelectItem>
                <SelectItem value="material_execute">领料出库单</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => handleSearch(code, type)} disabled={loading}>
            <Search className="w-4 h-4" /> {loading ? '查询中...' : '查询'}
          </Button>
        </div>

        {/* 结果 */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">加载中...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
            {searched ? '没有匹配的已删除单据' : '输入单号开始查询'}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-8"></th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单号</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">类型</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">删除人</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">删除时间</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">删除原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const mats = snapshotMaterials(r.snapshot);
                  const isExpanded = expandedId === r.id;
                  return (
                    <FragmentRow
                      key={r.id}
                      row={r}
                      mats={mats}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedId(isExpanded ? null : r.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </UnifiedModal>
  );
}

/** 单行 + 展开快照详情 */
function FragmentRow({
  row, mats, isExpanded, onToggle,
}: {
  row: ArchivedDoc;
  mats: any[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const s = row.snapshot;
  const applicant = String(s.applicant || s.applicant_name || '-');
  const date = String(s.date || s.apply_date || '-');
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-3 py-2">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </td>
        <td className="px-3 py-2 font-mono text-blue-700">{row.docCode}</td>
        <td className="px-3 py-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${row.docType === 'material_request' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
            {DOC_TYPE_LABEL[row.docType] || row.docType}
          </span>
        </td>
        <td className="px-3 py-2 text-gray-700">{row.deletedBy || '-'}</td>
        <td className="px-3 py-2 text-gray-500">{row.deletedAt.slice(0, 19).replace('T', ' ')}</td>
        {/* 2026-09-27 修复：reason 渲染兜底——历史脏数据可能存了 "[object Object]"
            （改造过渡期事件对象被 toString 所致），统一显示为"未填写" */}
        <td className="px-3 py-2 text-gray-600 max-w-[220px] truncate" title={cleanReason(row.reason)}>{cleanReason(row.reason)}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-slate-50">
            <div className="mb-2 text-xs text-gray-600 flex gap-4">
              <span>申请人：<strong className="text-gray-800">{applicant}</strong></span>
              <span>单据日期：<strong className="text-gray-800">{date}</strong></span>
              <span>物料 {mats.length} 种</span>
            </div>
            {mats.length > 0 ? (
              <table className="w-full text-xs bg-white rounded border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">物料编码</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">物料名称</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600">申请量</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600">实发量</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">单位</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mats.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 font-mono text-gray-700">{m.materialCode || m.code || '-'}</td>
                      <td className="px-2 py-1.5 text-gray-800">{m.materialName || m.name || '-'}</td>
                      <td className="px-2 py-1.5 text-right">{m.requestedQuantity ?? '-'}</td>
                      <td className="px-2 py-1.5 text-right">{m.actualQuantity ?? '-'}</td>
                      <td className="px-2 py-1.5 text-gray-500">{m.unit || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-xs text-gray-400">（快照无物料明细）</div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
