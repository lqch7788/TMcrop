/**
 * 育苗新增弹窗 — 备注与附件区
 * 2026-10-18：从 AddModal.tsx 拆出（纯移动，无逻辑变更）
 */
import type { Dispatch, SetStateAction } from 'react';
import { Upload, X } from 'lucide-react';
import { Input, Label, TextArea, Button } from '@/components/ui';
import type { AddFormData } from './types';

interface RemarkAttachmentSectionProps {
  formData: AddFormData;
  setFormData: Dispatch<SetStateAction<AddFormData>>;
  pictures: string[];
  setPictures: Dispatch<SetStateAction<string[]>>;
}

export function RemarkAttachmentSection({
  formData,
  setFormData,
  pictures,
  setPictures,
}: RemarkAttachmentSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">备注与附件</h3>
      <div className="space-y-4">
        {/* 备注 */}
        <div>
          <Label className="text-gray-900">备注</Label>
          <TextArea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="请输入备注信息"
          />
        </div>

        {/* 图片上传 */}
        <div>
          <Label className="text-gray-900">图片上传</Label>
          <div className="border-2 border-dashed border-gray-400 rounded-lg p-4">
            {/* 已上传的图片预览 */}
            {pictures.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {pictures.map((pic, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={pic}
                      alt={`预览${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPictures(pictures.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {/* 上传按钮 */}
            <Label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 rounded-lg py-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">点击上传图片</span>
              <Input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    Array.from(files).forEach(file => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        setPictures([...pictures, result]);
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                  e.target.value = '';
                }}
              />
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
