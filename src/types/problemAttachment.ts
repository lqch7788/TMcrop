/**
 * 问题附件类型定义（V2.1 铁律：迁出 useProblemAttachments）
 * 2026-06-04：原 useProblemAttachments.ts 死代码删除，type 迁到此处
 * 后端表：problem_attachments（base64 data 存储）
 */
export type AttachmentType = 'photo_before' | 'photo_after' | 'voice' | 'gps' | 'material';

export interface ProblemAttachment {
  id: string;
  problemId: number;
  flowRecordId?: string | null;
  type: AttachmentType;
  /** base64 字符串（data:image/...;base64,... 或纯 base64） */
  data: string;
  filename: string;
  timestamp: string;
}
