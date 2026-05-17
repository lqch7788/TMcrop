/**
 * IoT数据接入 Zod 请求校验
 * 确保水肥一体机上传的数据格式正确
 */
import { z } from 'zod';

/** 单条IoT施肥记录 */
const iotRecordSchema = z.object({
  iot_record_id: z.string().min(1).max(100),
  fertilizer_name: z.string().min(1).max(200),
  fertilizer_type: z.string().min(1).max(50),
  quantity: z.number().positive('施肥量必须大于0'),
  dilution_ratio: z.string().min(1).max(50),
  greenhouse_name: z.string().min(1).max(200),
  area_name: z.string().max(200).optional(),
  crop_name: z.string().min(1).max(200),
  unit_price: z.number().min(0).optional(),
  fertilize_time: z.string().min(1).max(30),
});

/** IoT批量接入请求 */
export const iotIngestSchema = z.object({
  device_id: z.string().min(1).max(50),
  device_name: z.string().min(1).max(100).optional(),
  records: z.array(iotRecordSchema).min(1, '至少需要1条记录').max(100, '单次最多100条记录'),
});

export type IotIngestRequest = z.infer<typeof iotIngestSchema>;
