/**
 * 视频管理页面 — iAGS Camera 集成
 * 摄像头注册和RTSP视频流地址配置
 * Phase 0 占位页面，完整实现在 Phase 3
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Video } from 'lucide-react';

export default function CameraManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Video className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">视频管理</h1>
          <p className="text-sm text-gray-500">摄像头注册和RTSP视频流地址配置</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">视频管理功能</h2>
        <p className="text-sm text-gray-500 mb-4">注册和管理摄像头设备，配置RTSP/HTTP视频流地址和大棚关联</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          该功能正在开发中（Phase 3），敬请期待...
        </div>
      </div>
    </div>
  );
}
