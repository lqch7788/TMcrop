/**
 * 从 V1.3 100% 一致复制
 */
import { History } from 'lucide-react';

const VideoPlayback = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">视频回放</h1>
        <p className="text-gray-500 mt-1">查看历史视频录像</p>
      </div>

      <div className="bg-[var(--color-card-bg)] rounded-xl p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col items-center justify-center py-16">
          <History className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-600">视频回放</h2>
          <p className="text-gray-400 mt-2">页面开发中...</p>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayback;
