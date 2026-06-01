/**
 * 技术方案页面 Header
 * 显示页面标题和描述
 */
import { FileCode } from 'lucide-react';

export function TechSolutionHeader() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <FileCode className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">技术方案列表</h1>
          <p className="text-gray-500">种植技术方案的管理与发布</p>
        </div>
      </div>
    </div>
  );
}
