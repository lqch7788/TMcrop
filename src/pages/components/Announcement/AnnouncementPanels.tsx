/**
 * 类型管理面板组件
 * 显示公告类型汇总和分类管理
 */
import { Tag, Plus } from 'lucide-react';
import type { NoticeType, Notice } from '../../types/announcement.types';
import { getStatusColor } from '../../hooks/useAnnouncement';

interface TypePanelProps {
  noticeTypes: NoticeType[];
  notices: Notice[];
  categories: string[];
}

export default function TypePanel({ noticeTypes, notices, categories }: TypePanelProps) {
  return (
    <div className="space-y-6">
      {/* 类型卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {noticeTypes.map((type, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:border-blue-300 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{type.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{type.name}</h3>
                  <p className="text-sm text-gray-500">{type.count} 条公告</p>
                </div>
              </div>
              <button className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity">
                管理
              </button>
            </div>
            <div className="space-y-2">
              {notices.filter(n => n.type === type.name).slice(0, 3).map(n => (
                <div key={n.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 truncate flex-1">{n.title}</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusColor(n.status)}`}>
                    {n.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 分类管理表格 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />公告分类管理
          </h3>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="w-4 h-4" />新增分类
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-semibold">分类名称</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">所属类型</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">公告数量</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">状态</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {categories.filter(c => c !== '全部').map((cat, index) => {
                const count = notices.filter(n => n.category === cat).length;
                const type = cat === '行政通知' || cat === '培训通知' || cat === '采购通知' || cat === '活动通知' || cat === '制度修订' ? '行政公告' : '生产公告';
                return (
                  <tr key={index} className="hover:bg-blue-50 transition-all duration-300">
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{cat}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200`}>
                        {type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 font-mono">{count}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">启用</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:underline text-sm">编辑</button>
                        <button className="text-red-600 hover:underline text-sm">删除</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
