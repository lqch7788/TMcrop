/**
 * 反馈附件展示组件
 * 用于展示 GPS、照片、语音、物资编码等反馈数据
 * 支持 compact 模式（列表页）和 full 模式（详情/验收弹窗）
 */

import { useState } from 'react';
import { MapPin, Camera, Package, Mic, X, ChevronLeft, ChevronRight, Copy, ExternalLink } from 'lucide-react';
import type { ProblemAttachment, AttachmentType } from '../../types/problemAttachment';

// 附件类型配置
const ATTACHMENT_CONFIG: Record<AttachmentType, { label: string; icon: typeof MapPin; color: string }> = {
  photo_before: { label: '作业前照片', icon: Camera, color: 'blue' },
  photo_after: { label: '作业后照片', icon: Camera, color: 'orange' },
  voice: { label: '语音备注', icon: Mic, color: 'red' },
  gps: { label: 'GPS位置', icon: MapPin, color: 'emerald' },
  material: { label: '物资编码', icon: Package, color: 'purple' },
};

// GPS 数据结构
interface GpsData {
  lat: number;
  lng: number;
}

// Props 类型
interface FeedbackAttachmentsProps {
  // 附件列表（直接传入）
  attachments?: ProblemAttachment[];
  // 或传入 GPS 数据
  gpsData?: GpsData | null;
  // 显示模式
  mode?: 'compact' | 'full';
  // 是否显示标签
  showLabel?: boolean;
  // 自定义类名
  className?: string;
}

/**
 * 照片网格组件（支持点击放大）
 */
function PhotoGrid({ photos, mode }: { photos: ProblemAttachment[]; mode: 'compact' | 'full' }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (photos.length === 0) return null;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const gridCols = mode === 'compact' ? 'grid-cols-4' : 'grid-cols-3';

  return (
    <>
      <div className={`grid ${gridCols} gap-2`}>
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            className="relative group cursor-pointer overflow-hidden rounded-lg"
            onClick={() => openLightbox(idx)}
          >
            <img
              src={photo.data}
              alt={photo.filename}
              className="w-full h-20 object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={goPrev}
            className="absolute left-4 p-2 text-white hover:bg-white/20 rounded-full"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <img
            src={photos[currentIndex].data}
            alt={photos[currentIndex].filename}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />

          <button
            onClick={goNext}
            className="absolute right-4 p-2 text-white hover:bg-white/20 rounded-full"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * GPS 位置展示组件
 */
function GpsDisplay({ gpsData, mode, compact }: { gpsData: GpsData; mode: 'compact' | 'full'; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openMaps = () => {
    window.open(`https://maps.google.com/?q=${gpsData.lat},${gpsData.lng}`, '_blank');
  };

  const colorClass = 'emerald';

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-emerald-600">
        <MapPin className="w-4 h-4" />
        <span className="text-xs">{gpsData.lat.toFixed(4)}, {gpsData.lng.toFixed(4)}</span>
      </div>
    );
  }

  return (
    <div className={`border-2 border-${colorClass}-200 rounded-lg p-3 bg-${colorClass}-50`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-full bg-${colorClass}-100 flex items-center justify-center`}>
          <MapPin className={`w-4 h-4 text-${colorClass}-600`} />
        </div>
        <span className="font-medium text-gray-700">GPS 位置</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-emerald-600">纬度：</span>
          <span className="font-mono">{gpsData.lat.toFixed(6)}</span>
        </div>
        <div>
          <span className="text-emerald-600">经度：</span>
          <span className="font-mono">{gpsData.lng.toFixed(6)}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={copyCoordinates}
          className={`flex items-center gap-1 px-3 py-1.5 bg-${colorClass}-500 text-white rounded text-xs hover:bg-${colorClass}-600 transition-colors`}
        >
          <Copy className="w-3 h-3" />
          {copied ? '已复制' : '复制坐标'}
        </button>
        <button
          onClick={openMaps}
          className={`flex items-center gap-1 px-3 py-1.5 bg-white border border-${colorClass}-300 text-${colorClass}-700 rounded text-xs hover:bg-${colorClass}-50 transition-colors`}
        >
          <ExternalLink className="w-3 h-3" />
          打开地图
        </button>
      </div>
    </div>
  );
}

/**
 * 语音播放组件
 */
function VoicePlayer({ attachment }: { attachment: ProblemAttachment }) {
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const playAudio = () => {
    if (!audioUrl) {
      // 创建音频 URL
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(atob(attachment.data.split(',')[1] || attachment.data), c => c.charCodeAt(0))], { type: 'audio/webm' })
      );
      setAudioUrl(url);
    }
    // 播放逻辑需要进一步实现
    setPlaying(!playing);
  };

  const colorClass = 'red';

  return (
    <div className={`border-2 border-${colorClass}-200 rounded-lg p-3 bg-${colorClass}-50`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-${colorClass}-100 flex items-center justify-center`}>
            <Mic className={`w-4 h-4 text-${colorClass}-600`} />
          </div>
          <span className="font-medium text-gray-700">语音备注</span>
        </div>
        <button
          onClick={playAudio}
          className={`px-4 py-2 bg-${colorClass}-500 text-white rounded-lg hover:bg-${colorClass}-600 transition-colors flex items-center gap-2`}
        >
          <Mic className="w-4 h-4" />
          {playing ? '暂停' : '播放'}
        </button>
      </div>
    </div>
  );
}

/**
 * 物资编码展示组件
 */
function MaterialDisplay({ attachment }: { attachment: ProblemAttachment }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(attachment.data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colorClass = 'purple';

  return (
    <div className={`border-2 border-${colorClass}-200 rounded-lg p-3 bg-${colorClass}-50`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-${colorClass}-100 flex items-center justify-center`}>
            <Package className={`w-4 h-4 text-${colorClass}-600`} />
          </div>
          <div>
            <span className="font-medium text-gray-700">物资编码</span>
            <p className="text-sm text-gray-600 font-mono">{attachment.data}</p>
          </div>
        </div>
        <button
          onClick={copyCode}
          className={`px-3 py-1.5 bg-${colorClass}-500 text-white rounded text-xs hover:bg-${colorClass}-600 transition-colors`}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
    </div>
  );
}

/**
 * 反馈附件展示组件
 */
export function FeedbackAttachments({
  attachments = [],
  gpsData = null,
  mode = 'full',
  showLabel = true,
  className = ''
}: FeedbackAttachmentsProps) {
  const isCompact = mode === 'compact';

  // 按类型分组附件
  const photosBefore = attachments.filter(a => a.type === 'photo_before');
  const photosAfter = attachments.filter(a => a.type === 'photo_after');
  const voices = attachments.filter(a => a.type === 'voice');
  const materials = attachments.filter(a => a.type === 'material');
  const gpsAttachments = attachments.filter(a => a.type === 'gps');

  // Compact 模式：显示图标状态
  if (isCompact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* GPS 状态 */}
        {gpsData && (
          <GpsDisplay gpsData={gpsData} mode="compact" compact />
        )}
        {/* 照片数量 */}
        {(photosBefore.length > 0 || photosAfter.length > 0) && (
          <div className="flex items-center gap-1 text-blue-600">
            <Camera className="w-4 h-4" />
            <span className="text-xs">{photosBefore.length + photosAfter.length}</span>
          </div>
        )}
        {/* 语音状态 */}
        {voices.length > 0 && (
          <div className="flex items-center gap-1 text-red-600">
            <Mic className="w-4 h-4" />
          </div>
        )}
        {/* 物资编码状态 */}
        {materials.length > 0 && (
          <div className="flex items-center gap-1 text-purple-600">
            <Package className="w-4 h-4" />
          </div>
        )}
      </div>
    );
  }

  // Full 模式：完整展示
  return (
    <div className={`space-y-4 ${className}`}>
      {/* GPS 位置 */}
      {(gpsData || gpsAttachments.length > 0) && (
        <GpsDisplay
          gpsData={gpsData || (gpsAttachments[0]?.data ? JSON.parse(gpsAttachments[0].data) : { lat: 0, lng: 0 })}
          mode="full"
        />
      )}

      {/* 作业前照片 */}
      {photosBefore.length > 0 && (
        <div>
          {showLabel && (
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">作业前照片</span>
              <span className="text-xs text-gray-500">({photosBefore.length}张)</span>
            </div>
          )}
          <PhotoGrid photos={photosBefore} mode="full" />
        </div>
      )}

      {/* 作业后照片 */}
      {photosAfter.length > 0 && (
        <div>
          {showLabel && (
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">作业后照片</span>
              <span className="text-xs text-gray-500">({photosAfter.length}张)</span>
            </div>
          )}
          <PhotoGrid photos={photosAfter} mode="full" />
        </div>
      )}

      {/* 语音备注 */}
      {voices.map(voice => (
        <VoicePlayer key={voice.id} attachment={voice} />
      ))}

      {/* 物资编码 */}
      {materials.map(material => (
        <MaterialDisplay key={material.id} attachment={material} />
      ))}
    </div>
  );
}

/**
 * 反馈状态图标组件（用于列表页）
 * 只显示状态图标，不显示详情
 */
export function FeedbackStatusIcons({
  attachments = [],
  gpsData = null
}: {
  attachments?: ProblemAttachment[];
  gpsData?: GpsData | null;
}) {
  const hasGps = !!gpsData || attachments?.some(a => a.type === 'gps');
  const hasPhotosBefore = attachments?.some(a => a.type === 'photo_before');
  const hasPhotosAfter = attachments?.some(a => a.type === 'photo_after');
  const hasVoice = attachments?.some(a => a.type === 'voice');
  const hasMaterial = attachments?.some(a => a.type === 'material');

  return (
    <div className="flex items-center gap-1.5">
      {hasGps && <MapPin className="w-4 h-4 text-emerald-600" />}
      {!hasGps && <MapPin className="w-4 h-4 text-gray-300" />}
      {hasPhotosBefore && <Camera className="w-4 h-4 text-blue-600" />}
      {!hasPhotosBefore && <Camera className="w-4 h-4 text-gray-300" />}
      {hasPhotosAfter && <Camera className="w-4 h-4 text-orange-600" />}
      {!hasPhotosAfter && <Camera className="w-4 h-4 text-gray-300" />}
      {hasVoice && <Mic className="w-4 h-4 text-red-600" />}
      {!hasVoice && <Mic className="w-4 h-4 text-gray-300" />}
      {hasMaterial && <Package className="w-4 h-4 text-purple-600" />}
      {!hasMaterial && <Package className="w-4 h-4 text-gray-300" />}
    </div>
  );
}

export default FeedbackAttachments;
