/**
 * 育苗创建请求 Zod 校验 schema
 * 2026-07-14：从 seedling.service.ts 提取（该文件已被删除：未使用的死服务类 + 列名错误）
 * 来源：任务 5 — source_id 强校验（种源必填，移除"无种源"选项）
 */

import { z } from 'zod';

/**
 * 育苗创建请求 Zod schema
 * - source_id: 种源 ID 必填（V1.1 现状允许为空，V2 强校验）
 * - 其他字段保持 V1.1 现状
 */
export const CreateSeedlingSchema = z.object({
  source_id: z.string().min(1, { message: '种源 ID 必填，请先选择种源' }),
  crop_name: z.string().min(1, { message: '作物名称必填' }),
  crop_variety: z.string().optional(),
  greenhouse_id: z.string().optional(),
  greenhouse_name: z.string().optional(),
  seedling_date: z.string().optional(),
  expected_finish_date: z.string().optional(),
  quantity: z.number().int().nonnegative().optional(),
  unit: z.string().optional(),
  status: z.string().optional(),
  remarks: z.string().optional(),
});

/**
 * 校验并解析育苗创建请求
 * @throws ZodError 校验失败
 */
export function validateCreateSeedling(input: unknown) {
  return CreateSeedlingSchema.parse(input);
}
