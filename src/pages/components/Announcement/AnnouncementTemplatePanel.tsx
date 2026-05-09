/**
 * 模板面板组件
 * 显示公告模板库
 */
import { FileText, Plus, Copy, Edit, Trash2, Tag } from 'lucide-react';
import type { Template } from '../../types/announcement.types';

interface TemplatePanelProps {
  templates: Template[];
}

export default function TemplatePanel({ templates }: TemplatePanelProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />公告模板库
          </h3>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="w-4 h-4" />新增模板
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{template.name}</h4>
                    <span className="text-xs text-gray-500">{template.code}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  template.status === '启用'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                }`}>
                  {template.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {template.type} · {template.category}
                </span>
                <span>使用 {template.usageCount} 次</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
                  <Copy className="w-3 h-3" />使用模板
                </button>
                <button className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <Edit className="w-3 h-3" />
                </button>
                <button className="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
