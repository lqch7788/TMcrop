/**
 * 种植设置页面 — iAGS Plantset 集成
 * 种植图标和品种种植参数配置，对接已有种植管理模块
 * Phase 0 占位页面，完整实现在 Phase 6
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Tractor } from 'lucide-react';

export default function PlantSettingManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Tractor className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">种植设置</h1>
          <p className="text-sm text-gray-500">种植图标和品种种植参数配置（对接已有种植管理模块）</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <Tractor className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">种植设置功能</h2>
        <p className="text-sm text-gray-500 mb-4">管理种植图标和品种对应的种植参数配置</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          该功能正在开发中（Phase 6），敬请期待...
        </div>
      </div>
    </div>
  );
}
