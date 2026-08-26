/**
 * 追溯码管理 — 从 V1.3 100% 一致复制
 */
import { QrCode } from 'lucide-react';

const TraceCode = () => {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-6 h-6 text-[#11BA80]" />
        <h1 className="text-2xl font-bold text-gray-800">追溯码管理</h1>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <p className="text-gray-600">追溯码管理系统 - 页面开发中</p>
      </div>
    </div>
  );
};

export default TraceCode;