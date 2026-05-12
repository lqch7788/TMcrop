/**
 * 数据同步页面
 * 将 localStorage 数据同步到后端数据库
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface SyncResult {
  table: string;
  imported: number;
  success: boolean;
  error?: string;
}

interface TableInfo {
  name: string;
  key: string;
  description: string;
  count: number;
}

const API_BASE = '/api';

export default function SyncDataPage() {
  const [results, setResults] = useState<SyncResult[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [localStats, setLocalStats] = useState<Record<string, number>>({});

  // 各模块的 localStorage key 和描述
  const tables: TableInfo[] = [
    { name: '种源管理', key: 'crop_seed_sources', description: '种源批次数据' },
    { name: '育苗管理', key: 'crop_seedlings', description: '育苗记录数据' },
    { name: '种植管理', key: 'crop_plantings', description: '种植记录数据' },
    { name: '采收入库', key: 'harvest_records', description: '采收入库记录' },
    { name: '实例追溯', key: 'crop_instances', description: '作物实例追溯' },
  ];

  // 加载数据库统计
  const loadDbStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync/stats`);
      const data = await res.json();
      if (data.success) {
        setDbStats(data.data);
      }
    } catch (error) {
      console.error('获取数据库统计失败:', error);
    }
  };

  // 加载 localStorage 统计
  const loadLocalStats = () => {
    const stats: Record<string, number> = {};
    for (const table of tables) {
      try {
        const data = localStorage.getItem(table.key);
        if (data) {
          const parsed = JSON.parse(data);
          stats[table.key] = Array.isArray(parsed) ? parsed.length : 0;
        } else {
          stats[table.key] = 0;
        }
      } catch {
        stats[table.key] = 0;
      }
    }
    setLocalStats(stats);
  };

  // 初始化
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadDbStats();
      loadLocalStats();
      setLoading(false);
    };
    init();
  }, []);

  // 获取 localStorage 数据
  const getLocalData = (key: string): any[] => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`读取 ${key} 失败:`, error);
    }
    return [];
  };

  // 同步单个模块
  const syncTable = async (table: TableInfo): Promise<SyncResult> => {
    const localData = getLocalData(table.key);

    if (localData.length === 0) {
      return {
        table: table.name,
        imported: 0,
        success: true,
        error: 'localStorage 无数据'
      };
    }

    // 根据模块选择正确的 API 端点
    let endpoint = '';
    switch (table.key) {
      case 'crop_seed_sources':
        endpoint = '/sync/seed-sources';
        break;
      case 'crop_seedlings':
        endpoint = '/sync/seedlings';
        break;
      case 'crop_plantings':
        endpoint = '/sync/plantings';
        break;
      case 'harvest_records':
        endpoint = '/sync/harvest';
        break;
      case 'crop_instances':
        endpoint = '/sync/crop-instances';
        break;
      default:
        return {
          table: table.name,
          imported: 0,
          success: false,
          error: '未知的数据类型'
        };
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: localData }),
      });

      const result = await res.json();

      if (result.success) {
        return {
          table: table.name,
          imported: result.data.imported,
          success: true
        };
      } else {
        return {
          table: table.name,
          imported: 0,
          success: false,
          error: result.error || '同步失败'
        };
      }
    } catch (error) {
      return {
        table: table.name,
        imported: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };

  // 执行全部同步
  const handleSyncAll = async () => {
    setSyncing(true);
    setResults([]);

    const syncResults: SyncResult[] = [];

    for (const table of tables) {
      const result = await syncTable(table);
      syncResults.push(result);
      setResults([...syncResults]);
    }

    // 刷新统计数据
    await loadDbStats();
    loadLocalStats();

    setSyncing(false);
  };

  // 渲染结果图标
  const renderIcon = (result?: SyncResult) => {
    if (!result) return <Database className="w-5 h-5 text-gray-400" />;
    if (result.success) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">数据同步</h1>
              <p className="text-gray-500">将 localStorage 数据同步到后端数据库</p>
            </div>
          </div>
        </div>

        {/* 说明 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">注意事项</p>
              <ul className="text-sm text-amber-700 mt-1 space-y-1">
                <li>• 此操作会<strong>清空后端数据库</strong>中的对应数据</li>
                <li>• 然后用 localStorage 中的数据<strong>完全替换</strong></li>
                <li>• 同步前请确保 localStorage 中的数据是正确的</li>
                <li>• 建议在操作前备份数据库</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 数据统计 */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">数据统计</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">模块</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">localStorage</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">数据库</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => {
                  const localCount = localStats[table.key] || 0;
                  const dbCount = dbStats[table.key === 'crop_seed_sources' ? 'seed_sources' :
                                 table.key === 'crop_seedlings' ? 'seedlings' :
                                 table.key === 'crop_plantings' ? 'plantings' :
                                 table.key === 'harvest_records' ? 'harvest_records' :
                                 table.key === 'crop_instances' ? 'crop_instances' : ''] || 0;

                  return (
                    <tr key={table.key} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{table.name}</p>
                          <p className="text-sm text-gray-500">{table.description}</p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                          {localCount} 条
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {dbCount} 条
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {localCount === dbCount ? (
                          <span className="text-green-500 text-sm">一致</span>
                        ) : (
                          <span className="text-amber-500 text-sm">不一致</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 同步按钮 */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                同步中...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                同步所有数据到数据库
              </>
            )}
          </button>
        </div>

        {/* 同步结果 */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">同步结果</h2>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    result.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  {renderIcon(result)}
                  <div className="flex-1">
                    <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.table}
                    </p>
                    {result.error && (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {result.success ? (
                      <span className="text-green-600 font-medium">
                        {result.imported > 0 ? `导入 ${result.imported} 条` : result.error || '完成'}
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium">失败</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
