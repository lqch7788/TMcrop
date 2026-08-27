/**
 * 追溯码管理 — 从 V1.3 100% 一致复制
 */
import { QrCode } from 'lucide-react';

const TraceCode = () => {
  return (
    <div className="pt-0 px-6 pb-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">追溯码管理</h1>
              <p className="text-gray-500 mt-1">追溯码管理系统</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <p className="text-gray-600">追溯码管理系统 - 页面开发中</p>
      </div>
    </div>
  );
};

export default TraceCode;