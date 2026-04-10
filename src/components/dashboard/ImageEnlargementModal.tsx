/**
 * 图片放大查看弹窗组件
 * 用于查看作物图片等场景的放大展示
 */

interface ImageEnlargementModalProps {
  isOpen: boolean;
  imageIndex: number;
  totalImages?: number;
  onClose: () => void;
  placeholderText?: string;
}

/**
 * 全屏图片查看器
 * 特性：
 * - 半透明黑色背景遮罩
 * - 点击背景关闭
 * - 关闭按钮
 * - 图片计数器
 */
export function ImageEnlargementModal({
  isOpen,
  imageIndex,
  totalImages = 5,
  onClose,
  placeholderText = '（当前为占位图片）'
}: ImageEnlargementModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center p-4">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white text-2xl z-10"
        >
          ×
        </button>
        {/* 图片显示区域 */}
        <div className="bg-[#F2F6FA] rounded-lg w-full h-full max-h-[80vh] flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="w-32 h-32 mx-auto mb-4 rounded-lg bg-gray-200 flex items-center justify-center">
              <span className="text-5xl">📷</span>
            </div>
            <p className="text-xl">图片 {imageIndex}</p>
            <p className="text-sm mt-2">{placeholderText}</p>
          </div>
        </div>
        {/* 图片计数器 */}
        <div className="mt-4 text-white text-sm">
          {imageIndex} / {totalImages}
        </div>
      </div>
    </div>
  );
}

export default ImageEnlargementModal;
