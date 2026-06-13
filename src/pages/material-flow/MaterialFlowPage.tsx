/**
 * 物料流转追溯页面
 * 2026-06-13 新建
 */
import React, { useState, useEffect } from 'react';
import { Search, BarChart3, TrendingUp, Package } from 'lucide-react';
import { Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Pagination } from '@/components/ui';
import { useMaterialFlowStore } from '@/stores';

const FLOW_TYPE_OPTIONS = [
  { value: 'all', label: '全部流转' },
  { value: 'seed_source→seedling', label: '种源→育苗' },
  { value: 'seed_source→planting', label: '种源→种植' },
  { value: 'seedling→planting', label: '育苗→种植' },
  { value: 'planting→harvest', label: '种植→采收' },
  { value: 'seedling→harvest', label: '育苗→采收' },
  { value: 'inventory→external', label: '库存→出库' },
];

export default function MaterialFlowPage() {
  const [activeTab, setActiveTab] = useState<'trace' | 'logs' | 'seedling' | 'planting' | 'annual'>('logs');
  const { logs, total, loading, traceData, statsData, loadLogs, loadTrace, loadCropStats, loadSourceStats, loadAnnualStats } = useMaterialFlowStore();

  // 流水列表筛选
  const [page, setPage] = useState(1);
  const [flowType, setFlowType] = useState('all');
  const [cropName, setCropName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 批次追溯
  const [traceCode, setTraceCode] = useState('');

  // 年度选择
  const currentYear = new Date().getFullYear();
  const [statYear, setStatYear] = useState(currentYear);

  useEffect(() => {
    if (activeTab === 'logs') loadLogs({ page, flowType: flowType === 'all' ? undefined : flowType, cropName, startDate, endDate });
    else if (activeTab === 'seedling') loadCropStats(statYear);
    else if (activeTab === 'planting') loadSourceStats(statYear);
    else if (activeTab === 'annual') loadAnnualStats(statYear);
  }, [activeTab, page, flowType, statYear]);

  const handleSearch = () => {
    setPage(1);
    loadLogs({ page: 1, flowType: flowType === 'all' ? undefined : flowType, cropName, startDate, endDate });
  };

  const handleTrace = () => {
    if (traceCode.trim()) loadTrace(traceCode.trim());
  };

  return (
    <div className="space-y-4 p-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">物料流转追溯</h1>
            <p className="text-gray-500 text-sm">全链路物料流转记录与统计分析</p>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-4 pb-0">
        <div className="flex gap-6 border-b border-gray-200">
          {[
            { key: 'logs', label: '流转记录', icon: Package },
            { key: 'trace', label: '批次追溯', icon: Search },
            { key: 'seedling', label: '育苗用料', icon: BarChart3 },
            { key: 'planting', label: '种植用料', icon: BarChart3 },
            { key: 'annual', label: '年度总览', icon: TrendingUp },
          ].map(tab => (
            <Button
              key={tab.key}
              variant="ghost"
              onClick={() => setActiveTab(tab.key as any)}
              className={`relative pb-3 text-sm font-semibold ${
                activeTab === tab.key ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </Button>
          ))}
        </div>

        <div className="py-4">
          {/* ====== 流转记录 Tab ====== */}
          {activeTab === 'logs' && (
            <div>
              {/* 筛选栏 */}
              <div className="flex items-end gap-3 mb-4 flex-wrap">
                <div>
                  <Label className="text-sm text-gray-600">流转类型</Label>
                  <Select value={flowType} onValueChange={setFlowType}>
                    <SelectTrigger className="w-40 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FLOW_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">作物名称</Label>
                  <Input value={cropName} onChange={e => setCropName(e.target.value)} placeholder="模糊搜索" className="w-32 h-9 text-sm" />
                </div>
                <Button size="sm" onClick={handleSearch}><Search className="w-4 h-4" /> 查询</Button>
              </div>
              {/* 表格 */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">时间</th><th className="px-3 py-2 text-left">流转类型</th>
                      <th className="px-3 py-2 text-left">作物</th><th className="px-3 py-2 text-left">上游</th>
                      <th className="px-3 py-2 text-right">消耗量</th><th className="px-3 py-2 text-left">下游</th>
                      <th className="px-3 py-2 text-right">产出量</th><th className="px-3 py-2 text-left">来源</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-400">加载中...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-400">暂无流转记录</td></tr>
                    ) : (
                      logs.map((log: any, i: number) => (
                        <tr key={log.id || i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{log.created_at?.split('T')[0]}</td>
                          <td className="px-3 py-2 font-medium">{log.flow_type}</td>
                          <td className="px-3 py-2">{log.crop_name}</td>
                          <td className="px-3 py-2 text-gray-600">{log.source_code || '-'}</td>
                          <td className="px-3 py-2 text-right">{log.source_quantity ? `${log.source_quantity} ${log.source_unit || ''}` : '-'}</td>
                          <td className="px-3 py-2">{log.target_code}</td>
                          <td className="px-3 py-2 text-right">{log.target_quantity ? `${log.target_quantity} ${log.target_unit || ''}` : '-'}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100">{log.source_category || '-'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {total > 0 && (
                <div className="mt-3">
                  <Pagination currentPage={page} totalPages={Math.ceil(total / 20)} pageSize={20} onPageChange={setPage} onPageSizeChange={() => {}} />
                </div>
              )}
            </div>
          )}

          {/* ====== 批次追溯 Tab ====== */}
          {activeTab === 'trace' && (
            <div>
              <div className="flex items-end gap-3 mb-4">
                <div>
                  <Label className="text-sm text-gray-600">批次号</Label>
                  <Input value={traceCode} onChange={e => setTraceCode(e.target.value)} placeholder="SS001 / SD001 / ZZ001 / HS001" className="w-64 h-9" onKeyDown={e => e.key === 'Enter' && handleTrace()} />
                </div>
                <Button size="sm" onClick={handleTrace}><Search className="w-4 h-4" /> 追溯</Button>
              </div>
              {loading ? (
                <div className="text-center py-8 text-gray-400">追溯中...</div>
              ) : traceData.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">时间</th><th className="px-3 py-2 text-left">流转</th><th className="px-3 py-2 text-left">上游</th><th className="px-3 py-2 text-right">消耗</th><th className="px-3 py-2 text-left">下游</th><th className="px-3 py-2 text-left">来源</th></tr></thead>
                    <tbody className="divide-y">
                      {traceData.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">{item.created_at?.split('T')[0]}</td>
                          <td className="px-3 py-2 font-medium">{item.flow_type}</td>
                          <td className="px-3 py-2">{item.source_code || '-'}</td>
                          <td className="px-3 py-2 text-right">{item.source_quantity ? `${item.source_quantity} ${item.source_unit || ''}` : '-'}</td>
                          <td className="px-3 py-2">{item.target_code}</td>
                          <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100">{item.source_category || '-'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : traceCode ? (
                <div className="text-center py-8 text-gray-400">未找到相关流转记录</div>
              ) : (
                <div className="text-center py-8 text-gray-400">输入批次号后点击追溯</div>
              )}
            </div>
          )}

          {/* ====== 育苗用料 Tab ====== */}
          {activeTab === 'seedling' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Label className="text-sm text-gray-600">年度</Label>
                <Select value={String(statYear)} onValueChange={v => setStatYear(Number(v))}>
                  <SelectTrigger className="w-28 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">作物</th><th className="px-3 py-2 text-left">来源</th><th className="px-3 py-2 text-right">总用量</th><th className="px-3 py-2 text-left">单位</th><th className="px-3 py-2 text-right">批次数</th></tr></thead>
                  <tbody className="divide-y">
                    {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">加载中...</td></tr> :
                     statsData.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">暂无数据</td></tr> :
                     statsData.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{item.crop_name}</td>
                        <td className="px-3 py-2">{item.source_category || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium">{Number(item.total_qty).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.source_unit || '-'}</td>
                        <td className="px-3 py-2 text-right">{item.batch_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====== 种植用料 Tab ====== */}
          {activeTab === 'planting' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Label className="text-sm text-gray-600">年度</Label>
                <Select value={String(statYear)} onValueChange={v => setStatYear(Number(v))}>
                  <SelectTrigger className="w-28 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">作物</th><th className="px-3 py-2 text-left">方式</th><th className="px-3 py-2 text-left">来源</th><th className="px-3 py-2 text-right">消耗量</th><th className="px-3 py-2 text-left">单位</th></tr></thead>
                  <tbody className="divide-y">
                    {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">加载中...</td></tr> :
                     statsData.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">暂无数据</td></tr> :
                     statsData.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{item.crop_name}</td>
                        <td className="px-3 py-2">{item.flow_type === 'seed_source→planting' ? '直接播种' : '育苗移栽'}</td>
                        <td className="px-3 py-2">{item.source_category || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium">{Number(item.total_qty).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.source_unit || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====== 年度总览 Tab ====== */}
          {activeTab === 'annual' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Label className="text-sm text-gray-600">年度</Label>
                <Select value={String(statYear)} onValueChange={v => setStatYear(Number(v))}>
                  <SelectTrigger className="w-28 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">流转环节</th><th className="px-3 py-2 text-left">作物</th><th className="px-3 py-2 text-right">流转次数</th><th className="px-3 py-2 text-right">总量</th><th className="px-3 py-2 text-left">单位</th></tr></thead>
                  <tbody className="divide-y">
                    {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">加载中...</td></tr> :
                     statsData.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">暂无数据</td></tr> :
                     statsData.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{item.flow_type}</td>
                        <td className="px-3 py-2">{item.crop_name}</td>
                        <td className="px-3 py-2 text-right">{item.flow_count}</td>
                        <td className="px-3 py-2 text-right font-medium">{Number(item.total_qty).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.unit || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
