/**
 * 通用图片上传组件
 * 提供统一的图片上传、预览、删除功能
 * 适用于巡查记录、育苗记录、种源管理等多个模块
 */

import React, { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';

// 图片上传组件属性接口
export interface ImageUploaderProps {
  /** 已上传的图片列表 */
  images: string[];
  /** 图片变化回调 */
  onChange: (images: string[]) => void;
  /** 最大图片数量限制，默认无限制 */
  maxCount?: number;
  /** 每张图片的宽度，默认80px */
  imageSize?: number;
  /** 是否使用相机图标（巡查模块使用），默认false使用上传图标 */
  useCameraIcon?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 通用图片上传组件
 *
 * @example
 * ```tsx
 * // 基本用法
 * <ImageUploader
 *   images={formData.photos}
 *   onChange={(images) => setFormData({ ...formData, photos: images })}
 *   maxCount={6}
 * />
 *
 * // 使用相机图标
 * <ImageUploader
 *   images={formData.issuePhotos}
 *   onChange={(images) => updateField('issuePhotos', images)}
 *   maxCount={6}
 *   useCameraIcon
 * />
 * ```
 */
export function ImageUploader({
  images,
  onChange,
  maxCount,
  imageSize = 80,
  useCameraIcon = false,
  className = '',
  disabled = false,
}: ImageUploaderProps) {
  // 处理图片上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // 计算剩余可上传数量
    const remaining = maxCount ? maxCount - images.length : files.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    filesToUpload.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onChange([...images, result]);
      };
      reader.readAsDataURL(file);
    });

    // 清空input，允许重复选择同一文件
    e.target.value = '';
  };

  // 删除图片
  const handleRemove = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  // 检查是否还能上传
  const canUpload = !maxCount || images.length < maxCount;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 图片预览区域 */}
      {images.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative rounded-lg overflow-hidden border border-gray-400 group"
              style={{ width: imageSize, height: imageSize }}
            >
              <img
                src={img}
                alt={`图片${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <Button
                  variant="destructive"
                  size="icon"
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-0 right-0 w-5 h-5 rounded-bl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      {canUpload && !disabled && (
        <Label
          className={`flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-lg border-2 border-dashed transition-colors ${
            useCameraIcon ? 'border-gray-400 hover:border-red-500 hover:bg-red-50' : 'border-gray-400'
          }`}
          style={{ width: imageSize, height: imageSize }}
        >
          {useCameraIcon ? (
            <>
              <Camera className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400 mt-1">添加</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">点击上传</span>
            </>
          )}
          <Input
            type="file"
            accept="image/*"
            multiple={!maxCount || maxCount > 1}
            onChange={handleFileChange}
            className="hidden"
          />
        </Label>
      )}

      {/* 数量提示 */}
      {maxCount && (
        <p className="text-xs text-gray-500">
          已添加 {images.length}/{maxCount} 张照片
        </p>
      )}
    </div>
  );
}

/**
 * 简单的单图片上传组件
 */
export interface SingleImageUploaderProps {
  /** 当前图片URL */
  image?: string;
  /** 图片变化回调 */
  onChange: (image: string | undefined) => void;
  /** 每张图片的宽度，默认80px */
  imageSize?: number;
  /** 自定义类名 */
  className?: string;
}

export function SingleImageUploader({
  image,
  onChange,
  imageSize = 80,
  className = '',
}: SingleImageUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onChange(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {image && (
        <div
          className="relative rounded-lg overflow-hidden border border-gray-400 group"
          style={{ width: imageSize, height: imageSize }}
        >
          <img src={image} alt="预览" className="w-full h-full object-cover" />
          <Button
            variant="destructive"
            size="icon"
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-0 right-0 w-5 h-5 rounded-bl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
      {!image && (
        <Label
          className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-lg border-2 border-dashed border-gray-400 transition-colors"
          style={{ width: imageSize, height: imageSize }}
        >
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-500">点击上传</span>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </Label>
      )}
    </div>
  );
}

export default ImageUploader;
