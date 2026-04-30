import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Loader2 } from 'lucide-react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: QRData) => void;
}

export interface QRData {
  type: 'farm' | 'equipment' | 'infrastructure' | 'other';
  code: string;
  name: string;
}

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  // 拖动状态
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  // 拖动开始
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  }, [position]);

  // 拖动中
  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.startPosX + dx,
        y: dragRef.current.startPosY + dy,
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isOpen) return;

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setError('');
    setIsScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {
          // Ignore scan failures (continuous scanning)
        }
      );
    } catch (err) {
      setError('无法访问摄像头，请检查权限设置');
      setIsScanning(false);
      console.error('Scanner error:', err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScan = (data: string) => {
    try {
      // 解析二维码数据
      const qrData: QRData = JSON.parse(data);

      // 验证数据格式
      if (!qrData.type || !qrData.code || !qrData.name) {
        setError('无效的二维码格式');
        return;
      }

      if (!['farm', 'equipment', 'infrastructure'].includes(qrData.type)) {
        setError('不支持的巡查类型');
        return;
      }

      stopScanner();
      onScanSuccess(qrData);
    } catch {
      setError('二维码解析失败');
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    handleScan(manualInput.trim());
  };

  const handleDemoScan = () => {
    // 演示数据：模拟扫码结果
    const demoData: QRData = {
      type: 'farm',
      code: 'G001',
      name: '玻璃温室A区'
    };
    stopScanner();
    onScanSuccess(demoData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        {/* 头部 - 可拖动区域 */}
        <div
          className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 flex items-center justify-between cursor-move"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-white" />
            <h3 className="text-lg font-semibold text-white">扫描二维码</h3>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 扫码区域 */}
          <div className="relative">
            <div
              id="qr-reader"
              ref={videoRef}
              className="w-full aspect-square bg-gray-900 rounded-xl overflow-hidden"
            />

            {/* 扫描框装饰 */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-3">
              {!isScanning ? (
                <button
                  onClick={startScanner}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-600 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  开始扫描
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  停止扫描
                </button>
              )}
            </div>

            {/* 加载状态 */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-0">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 手动输入 */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">手动输入</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="输入二维码数据 (JSON格式)"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleManualSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                确认
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              格式: {"{\"type\":\"farm\",\"code\":\"G001\",\"name\":\"玻璃温室A区\"}"}
            </p>
          </div>

          {/* 演示按钮 */}
          <div className="text-center">
            <button
              onClick={handleDemoScan}
              className="text-sm text-emerald-600 hover:text-emerald-700 underline"
            >
              演示：模拟扫码
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
