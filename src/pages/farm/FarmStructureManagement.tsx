/**
 * 基地架构管理页面（基地空间架构 V1.0）
 * 功能：公司基地管理（管理员配置入口）
 * 日常运营请使用「基地运营中心」
 */
import CompanyBaseTab from '../../components/farm-structure/CompanyBaseTab';

export default function FarmStructureManagement() {
  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/park-archive"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回园区总览"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">基地架构管理</h1>
              <p className="text-gray-500">公司基地结构配置（管理员入口）</p>
            </div>
          </div>
        </div>
      </div>

      {/* 说明文字 */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">提示：</span>
          基地架构用于配置公司-基地的层级结构。日常运营（温室管理、区域划分、种植记录）请使用「
          <a href="/settings/base-operations?baseOid=base_1780023508412" className="underline font-medium">基地运营中心</a>
          」。
        </p>
      </div>

      {/* 公司基地 TAB */}
      <CompanyBaseTab />
    </div>
  );
}
