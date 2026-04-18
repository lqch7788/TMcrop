/**
 * 反馈输入组件
 * 根据反馈类型动态渲染对应的输入控件（GPS、拍照、扫码、语音等）
 */

import { useState, useRef } from 'react';
import { MapPin, Camera, Package, Mic, CheckCircle, X, Play, Square, RotateCcw, Clock } from 'lucide-react';

// 反馈选项配置
export const FEEDBACK_OPTIONS = [
  { key: 'workload_confirm', label: '工作量确认', icon: Clock, color: 'emerald' },
  { key: 'gps', label: '位置打卡', icon: MapPin, color: 'blue' },
  { key: 'photo_before', label: '作业前照片', icon: Camera, color: 'purple' },
  { key: 'photo_after', label: '作业后照片', icon: Camera, color: 'pink' },
  { key: 'material', label: '物资扫码', icon: Package, color: 'amber' },
  { key: 'voice', label: '语音备注', icon: Mic, color: 'teal' },
] as const;

export type FeedbackType = typeof FEEDBACK_OPTIONS[number]['key'];

interface FeedbackInputProps {
  type: FeedbackType;
  value: any;
  onChange: (value: any) => void;
  label?: string;
}

// 获取选项配置
const getOptionConfig = (type: FeedbackType) => {
  return FEEDBACK_OPTIONS.find(opt => opt.key === type) || FEEDBACK_OPTIONS[0];
};

// 工作量确认组件
function WorkloadInput({ value, onChange }: { value: { days: number; hours: number; workers: number } | null; onChange: (v: { days: number; hours: number; workers: number } | null) => void }) {
  const [days, setDays] = useState(value?.days || 0);
  const [hours, setHours] = useState(value?.hours || 0);
  const [workers, setWorkers] = useState(value?.workers || 1);

  const handleConfirm = () => {
    onChange({ days, hours, workers });
  };

  const colorClass = 'emerald';

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-${colorClass}-100 flex items-center justify-center`}>
            <Clock className={`w-4 h-4 text-${colorClass}-600`} />
          </div>
          <span className="font-medium text-gray-700">工作量确认</span>
        </div>
        {value && (
          <span className={`px-2 py-1 bg-${colorClass}-100 text-${colorClass}-700 rounded text-xs flex items-center gap-1`}>
            <CheckCircle className="w-3 h-3" />
            已确认
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">工作天数</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-500">天</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">工作小时数</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(Math.min(24, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-500">小时</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">工作人数</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={workers}
                onChange={(e) => setWorkers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-500">人</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleConfirm}
          className={`w-full py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 flex items-center justify-center gap-2 transition-colors`}
        >
          <CheckCircle className="w-4 h-4" />
          确认工作量
        </button>
        {value && (
          <p className="text-xs text-emerald-600 text-center">
            已确认：{value.days} 天 {value.hours} 小时 {value.workers} 人
          </p>
        )}
      </div>
    </div>
  );
}

// GPS 位置打卡组件
function GpsInput({ value, onChange }: { value: { lat: number; lng: number } | null; onChange: (v: { lat: number; lng: number } | null) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = () => {
    if (!navigator.geolocation) {
      setError('浏览器不支持定位功能');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError('获取位置失败：' + err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const colorClass = 'emerald';

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-${colorClass}-100 flex items-center justify-center`}>
            <MapPin className={`w-4 h-4 text-${colorClass}-600`} />
          </div>
          <span className="font-medium text-gray-700">位置打卡</span>
        </div>
        {value && (
          <span className={`px-2 py-1 bg-${colorClass}-100 text-${colorClass}-700 rounded text-xs flex items-center gap-1`}>
            <CheckCircle className="w-3 h-3" />
            已获取
          </span>
        )}
      </div>

      {value ? (
        <div className="bg-emerald-50 rounded-lg p-3">
          <div className="text-sm text-emerald-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">当前坐标：</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-emerald-600">纬度：</span>
                <span className="font-mono">{value.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-emerald-600">经度：</span>
                <span className="font-mono">{value.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onChange(null)}
            className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            重新获取
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleCapture}
            disabled={loading}
            className={`w-full py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                获取中...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                点击获取当前位置
              </>
            )}
          </button>
          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// 照片输入组件
function PhotoInput({ value, onChange, captureType }: { value: string[]; onChange: (v: string[]) => void; captureType: 'environment' | 'user' }) {
  const colorClass = captureType === 'environment' ? 'blue' : 'orange';
  const label = captureType === 'environment' ? '作业前' : '作业后';

  const handleCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.capture = captureType;
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            onChange([...value, base64]);
          };
          reader.readAsDataURL(file);
        });
      }
    };
    input.click();
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={`border-2 border-gray-200 rounded-lg p-4 hover:border-${colorClass}-300 transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-${colorClass}-100 flex items-center justify-center`}>
            <Camera className={`w-4 h-4 text-${colorClass}-600`} />
          </div>
          <span className="font-medium text-gray-700">{label}照片</span>
        </div>
        {value.length > 0 && (
          <span className={`px-2 py-1 bg-${colorClass}-100 text-${colorClass}-700 rounded text-xs flex items-center gap-1`}>
            <CheckCircle className="w-3 h-3" />
            已上传 {value.length} 张
          </span>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img}
                alt={`${label}照片 ${idx + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => handleRemove(idx)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleCapture}
        className={`w-full py-3 rounded-lg bg-${colorClass}-500 text-white font-medium hover:bg-${colorClass}-600 flex items-center justify-center gap-2 transition-colors`}
      >
        <Camera className="w-4 h-4" />
        {value.length > 0 ? '继续添加照片' : '点击拍照'}
      </button>
    </div>
  );
}

// 物资扫码组件
function MaterialInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colorClass = 'purple';
  const [scanning, setScanning] = useState(false);

  // 模拟扫码（实际可扩展为扫码枪或扫二维码）
  const handleScan = () => {
    setScanning(true);
    // 模拟扫码结果
    setTimeout(() => {
      const mockCode = 'MAT-' + Date.now().toString().slice(-8);
      onChange(mockCode);
      setScanning(false);
    }, 500);
  };

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center`}>
            <Package className={`w-4 h-4 text-purple-600`} />
          </div>
          <span className="font-medium text-gray-700">物资扫码</span>
        </div>
        {value && (
          <span className={`px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs flex items-center gap-1`}>
            <CheckCircle className="w-3 h-3" />
            已扫码
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="扫描或输入物资编码"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleScan}
          disabled={scanning}
          className={`px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2 transition-colors`}
        >
          {scanning ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Package className="w-4 h-4" />
          )}
          扫码
        </button>
      </div>
      {value && (
        <p className="mt-2 text-xs text-purple-600">物资编码：{value}</p>
      )}
    </div>
  );
}

// 语音备注组件
function VoiceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colorClass = 'red';
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          setAudioChunks([...chunks]);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // 转换为 Base64
        const reader = new FileReader();
        reader.onload = () => {
          onChange(reader.result as string);
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
    }
  };

  const removeAudio = () => {
    setAudioUrl(null);
    setAudioChunks([]);
    onChange('');
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-red-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full bg-red-100 flex items-center justify-center`}>
            <Mic className={`w-4 h-4 text-red-600`} />
          </div>
          <span className="font-medium text-gray-700">语音备注</span>
        </div>
        {value && (
          <span className={`px-2 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1`}>
            <CheckCircle className="w-3 h-3" />
            已录音
          </span>
        )}
      </div>

      {audioUrl ? (
        <div className="bg-red-50 rounded-lg p-3">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setPlaying(false)}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={playAudio}
              className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              {playing ? (
                <>
                  <Square className="w-4 h-4" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  播放
                </>
              )}
            </button>
            <button
              onClick={removeAudio}
              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              重新录音
            </button>
          </div>
          <p className="mt-2 text-xs text-red-600">录音时长：{audioChunks.length > 0 ? '...' : '0秒'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
              recording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {recording ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                录音中... 点击停止
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                点击开始录音
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center">请说话并描述处理情况</p>
        </div>
      )}
    </div>
  );
}

/**
 * 反馈输入组件
 * 根据 type 渲染对应的输入控件
 */
export function FeedbackInput({ type, value, onChange }: FeedbackInputProps) {
  switch (type) {
    case 'workload_confirm':
      return <WorkloadInput value={value} onChange={onChange} />;
    case 'gps':
      return <GpsInput value={value} onChange={onChange} />;
    case 'photo_before':
      return <PhotoInput value={value || []} onChange={onChange} captureType="environment" />;
    case 'photo_after':
      return <PhotoInput value={value || []} onChange={onChange} captureType="environment" />;
    case 'material':
      return <MaterialInput value={value || ''} onChange={onChange} />;
    case 'voice':
      return <VoiceInput value={value || ''} onChange={onChange} />;
    default:
      return null;
  }
}

// 必填反馈选项标签组件
export function FeedbackBadge({ type }: { type: FeedbackType }) {
  const config = getOptionConfig(type);
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colorMap[config.color] || 'bg-gray-100 text-gray-700'}`}>
      {config.label}
    </span>
  );
}

export default FeedbackInput;
