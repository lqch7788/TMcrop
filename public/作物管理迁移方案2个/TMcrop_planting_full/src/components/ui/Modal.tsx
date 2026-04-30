import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  showFooter?: boolean;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  bodyClassName?: string;
  showMaximize?: boolean;
  enableDrag?: boolean;
  enableResize?: boolean;
  bottomContent?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  xxl: 'max-w-5xl',
  xxxl: 'max-w-6xl'
};

const sizeDefaults = {
  sm: { width: 400, height: 300 },
  md: { width: 500, height: 400 },
  lg: { width: 700, height: 500 },
  xl: { width: 900, height: 600 },
  xxl: { width: 1080, height: 650 },
  xxxl: { width: 1350, height: 700 }
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  onSubmit,
  submitText = '保存',
  cancelText = '取消',
  showFooter = true,
  footer,
  headerAction,
  bodyClassName = '',
  showMaximize = true,
  enableDrag = true,
  enableResize = true,
  bottomContent
}: ModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resize state
  const [modalSize, setModalSize] = useState(sizeDefaults[size]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialMouse, setInitialMouse] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

  const modalRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const BOUNDARY_PADDING = 30;

  // ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize position when modal opens
  useEffect(() => {
    if (isOpen && !isMaximized) {
      setModalSize(sizeDefaults[size]);
      // Center the modal
      const centerX = (window.innerWidth - sizeDefaults[size].width) / 2;
      const centerY = (window.innerHeight - sizeDefaults[size].height) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, [isOpen, size, isMaximized]);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only allow dragging from header when enableDrag is true
    if (enableDrag && (e.target as HTMLElement).closest('.modal-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [position, enableDrag]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Cancel previous RAF if exists
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        if (isDragging) {
          // Calculate new position with boundary constraints
          const rawX = e.clientX - dragOffset.x;
          const rawY = e.clientY - dragOffset.y;
          const clampedX = Math.max(BOUNDARY_PADDING, Math.min(rawX, window.innerWidth - modalSize.width - BOUNDARY_PADDING));
          const clampedY = Math.max(BOUNDARY_PADDING, Math.min(rawY, window.innerHeight - modalSize.height - BOUNDARY_PADDING));

          setPosition({
            x: clampedX,
            y: clampedY
          });
        }
        if (isResizing) {
          const deltaX = e.clientX - initialMouse.x;
          const deltaY = e.clientY - initialMouse.y;

          let newWidth = initialSize.width;
          let newHeight = initialSize.height;
          let newX = initialPosition.x;
          let newY = initialPosition.y;

          if (resizeDirection.includes('e')) {
            newWidth = Math.max(300, initialSize.width + deltaX);
          }
          if (resizeDirection.includes('s')) {
            newHeight = Math.max(200, initialSize.height + deltaY);
          }
          if (resizeDirection.includes('w')) {
            newWidth = Math.max(300, initialSize.width - deltaX);
            newX = initialPosition.x + (initialSize.width - newWidth);
          }
          if (resizeDirection.includes('n')) {
            newHeight = Math.max(200, initialSize.height - deltaY);
            newY = initialPosition.y + (initialSize.height - newHeight);
          }

          setModalSize({ width: newWidth, height: newHeight });
          setPosition({ x: newX, y: newY });
        }
      });
    };

    const handleMouseUp = () => {
      // Cancel any pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, initialSize, initialMouse, initialPosition, resizeDirection]);

  // Resize handle mouse down
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    if (!enableResize) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setInitialSize(modalSize);
    setInitialMouse({ x: e.clientX, y: e.clientY });
    setInitialPosition(position);
  }, [modalSize, position, enableResize]);

  const handleSubmit = async () => {
    if (onSubmit) {
      setIsSubmitting(true);
      await onSubmit();
      setIsSubmitting(false);
    }
  };

  const handleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setModalSize(sizeDefaults[size]);
      setPosition({ x: (window.innerWidth - sizeDefaults[size].width) / 2, y: (window.innerHeight - sizeDefaults[size].height) / 2 });
    } else {
      setIsMaximized(true);
      setPosition({ x: 0, y: 0 });
      setModalSize({ width: window.innerWidth - 32, height: window.innerHeight - 32 });
    }
  };

  if (!isOpen) return null;

  // 当拖动和调整大小都禁用时，使用居中布局
  const useCenteredLayout = !enableDrag && !enableResize && !isMaximized;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Container - Draggable & Resizable */}
      <div
        ref={modalRef}
        className={`bg-white rounded-xl shadow-xl flex flex-col ${useCenteredLayout ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : 'absolute'}`}
        style={useCenteredLayout ? {
          width: modalSize.width,
          maxHeight: '90vh'
        } : {
          left: position.x,
          top: position.y,
          width: isMaximized ? 'calc(100vw - 32px)' : modalSize.width,
          height: isMaximized ? 'calc(100vh - 32px)' : modalSize.height,
          maxHeight: '90vh'
        }}
        onMouseDown={useCenteredLayout ? undefined : handleMouseDown}
      >
        {/* Header - Double click to maximize */}
        <div
          className={`modal-header flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl ${enableDrag ? 'cursor-move' : 'cursor-default'} select-none`}
          onDoubleClick={handleMaximize}
        >
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="flex items-center gap-2">
            {headerAction}
            {showMaximize && (
              <>
                {/* Maximize/Restore Button */}
                <button
                  onClick={handleMaximize}
                  className="p-1.5 rounded-lg hover:bg-emerald-500 group relative"
                  title={isMaximized ? '还原窗口' : '最大化窗口'}
                >
                  {isMaximized ? (
                    <Minimize2 className="w-4 h-4 text-white" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-white" />
                  )}
                  {/* Tooltip */}
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                    {isMaximized ? '还原窗口' : '最大化窗口'}
                  </span>
                </button>
              </>
            )}
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-emerald-500"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Resize Handles */}
        {!isMaximized && enableResize && (
          <>
            {/* Corner handles - Enhanced visibility */}
            <div
              className="absolute top-0 left-0 w-2 h-2 cursor-nw-resize hover:w-3 hover:h-3 hover:bg-emerald-400/50 hover:shadow-md rounded-sm"
              onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
            />
            <div
              className="absolute top-0 right-0 w-2 h-2 cursor-ne-resize hover:w-3 hover:h-3 hover:bg-emerald-400/50 hover:shadow-md rounded-sm"
              onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
            />
            <div
              className="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize hover:w-3 hover:h-3 hover:bg-emerald-400/50 hover:shadow-md rounded-sm"
              onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
            />
            <div
              className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize hover:w-3 hover:h-3 hover:bg-emerald-400/50 hover:shadow-md rounded-sm"
              onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
            />
            {/* Edge handles */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-2 cursor-n-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
            />
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 cursor-s-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 's')}
            />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-8 cursor-w-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
            />
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-8 cursor-e-resize"
              onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
            />
          </>
        )}

        {/* Body - Responsive grid layout */}
        <div className={`flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col ${bodyClassName}`}>
          {children}
        </div>

        {/* Fixed Bottom Content */}
        {bottomContent && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
            {bottomContent}
          </div>
        )}

        {/* Footer */}
        {showFooter && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
            {footer ? footer : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  {cancelText}
                </button>
                {onSubmit && (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '保存中...' : submitText}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Form Field Components
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className = '', type = 'text', ...props }: InputProps) {
  return (
    <div>
      <input
        type={type}
        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
          error ? 'border-red-500' : 'border-gray-400'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ error, options, className = '', ...props }: SelectProps) {
  return (
    <div>
      <select
        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <div>
      <textarea
        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default Modal;
