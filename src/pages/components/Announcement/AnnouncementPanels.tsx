/**
 * 类型管理面板组件
 * 显示公告类型汇总和分类管理
 */
import { useState, useEffect } from 'react';
import { Tag, Plus } from 'lucide-react';
import type { NoticeType, Notice } from '../../types/announcement.types';
import { getStatusColor } from '../../hooks/useAnnouncement';
import { getDictionaries, getCategoryChineseName, type Dictionary } from '../../../services/dictionaryService';
import { Button } from '../../../components/ui/button';

interface TypePanelProps {
  noticeTypes: NoticeType[];
  notices: Notice[];
  categories: string[];
}

export default function TypePanel({ noticeTypes, notices, categories }: TypePanelProps) {
  // 公告分类数据（从数据词典读取）
  const [announcementCategories, setAnnouncementCategories] = useState<Dictionary[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // 从数据词典加载公告分类
  useEffect(() => {
    const loadAnnouncementCategories = async () => {
      try {
        setLoadingCategories(true);
        const allDicts = await getDictionaries();
        // 过滤出公告分类
        const announcementCates = allDicts
          .filter(d => d.category === 'announcement_category')
          .sort((a, b) => (a.sortNumber || 0) - (b.sortNumber || 0));
        setAnnouncementCategories(announcementCates);
      } catch (error) {
        console.error('加载公告分类失败:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadAnnouncementCategories();
  }, []);

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

      {/* 分类管理表格 - 从数据词典读取 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />公告分类管理
          </h3>
          <Button variant="blue" size="sm" className="flex items-center gap-1">
            <Plus className="w-4 h-4" />新增分类
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-semibold">分类名称</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">分类编码</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">排序</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">状态</th>
                <th className="px-3 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {loadingCategories ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500 text-sm">
                    加载中...
                  </td>
                </tr>
              ) : announcementCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500 text-sm">
                    暂无公告分类，请前往"系统设置-数据字典-任务通用"中添加
                  </td>
                </tr>
              ) : (
                announcementCategories.map((cat, index) => {
                  const count = notices.filter(n => n.category === cat.name).length;
                  return (
                    <tr key={index} className="hover:bg-blue-50 transition-all duration-300">
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">{cat.name}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                          {cat.code}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 font-mono">{cat.sortNumber || 0}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          cat.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {cat.status === 'active' ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-blue-600 hover:underline text-sm">编辑</button>
                          <button className="text-red-600 hover:underline text-sm">删除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
