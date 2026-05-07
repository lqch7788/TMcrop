import { ArrowLeftRight } from 'lucide-react';

export function MaterialReturnHeader() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <ArrowLeftRight className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产退料</h1>
            <p className="text-gray-500">生产退料记录管理</p>
          </div>
        </div>
      </div>
    </div>
  );
}
