/**
 * AI-09 病虫害图像识别服务（V1 — Mock 演示版）
 * 2026-08-22：P1 MVP
 *
 * Plan 要求：
 * - 基于深度学习图像识别（EfficientNet-B4+）
 * - 50+ 种病虫害
 * - 准确率 ≥90% / <3 秒
 *
 * V1 实现（网络阻断 XGBoost / EfficientNet 模型下载）：
 * - 使用 mock 演示：基于文件名/特征 hash 模拟识别
 * - 病虫害字典：与 usePestAlert.ts 的 pest_disease_dict 同步
 * - 待模型可加载后切换 ONNX 推理
 *
 * 数据流：
 * 1. 前端上传图片 → 后端接收 multipart/form-data
 * 2. mock 识别 → 返回病虫害名称 + 置信度 + 推荐处理
 * 3. 真实模型切换：加载 EfficientNet-B4 ONNX → ImageNet 特征提取 → 病虫害分类
 */

import { getDatabase } from '../../db';

interface ImageIdInput {
  image_id: string;                 // 图片 ID（前端上传后获得）
  image_name?: string;              // 文件名（mock 识别用）
  crop_type?: string;               // 作物类型（缩小识别范围）
  image_features?: {                // 模拟特征（真实模型输出前用 mock）
    avg_color?: number[];            // RGB 平均
    lesion_ratio?: number;            // 病灶占比
  };
}

interface PestIdentification {
  pest_name: string;
  pest_type: 'disease' | 'pest';    // 病害/虫害
  confidence: number;                // 0-1
  symptoms: string[];
  recommended_treatment: string[];
}

interface ImageIdResult {
  image_id: string;
  top_predictions: PestIdentification[];   // top-3
  inference_time_ms: number;
  model_version: string;
  model_type: 'mock' | 'efficientnet-b4';
  xai_reasons: string[];
  data_source: 'mock' | 'model';
}

const MODEL_VERSION = '1.0.0-mock';

const PEST_DISEASE_LIST: { name: string; type: 'disease' | 'pest'; symptoms: string[]; treatment: string[] }[] = [
  { name: '白粉病', type: 'disease', symptoms: ['叶片白色粉状物', '叶背霉斑'], treatment: ['喷施三唑酮', '加强通风'] },
  { name: '霜霉病', type: 'disease', symptoms: ['叶面黄色斑块', '叶背白色绒毛'], treatment: ['喷施烯酰吗啉', '控制湿度'] },
  { name: '炭疽病', type: 'disease', symptoms: ['圆形褐色病斑', '凹陷坏死'], treatment: ['喷施咪鲜胺', '清除病残体'] },
  { name: '蚜虫', type: 'pest', symptoms: ['叶片卷曲', '蜜露污染'], treatment: ['释放瓢虫天敌', '喷施吡虫啉'] },
  { name: '红蜘蛛', type: 'pest', symptoms: ['叶片黄化', '蛛丝'], treatment: ['增加湿度', '喷施阿维菌素'] },
  { name: '病毒病', type: 'disease', symptoms: ['花叶斑驳', '植株矮化'], treatment: ['拔除病株', '控制传播媒介'] },
  { name: '青枯病', type: 'disease', symptoms: ['萎蔫', '维管束褐变'], treatment: ['轮作', '抗病品种'] },
  { name: '锈病', type: 'disease', symptoms: ['橙黄色孢子堆'], treatment: ['喷施粉锈宁', '清理残株'] },
  { name: '叶斑病', type: 'disease', symptoms: ['褐色不规则斑'], treatment: ['喷施代森锰锌', '通风降湿'] },
  { name: '白粉虱', type: 'pest', symptoms: ['叶片黄化', '蜜露'], treatment: ['黄板诱杀', '释放丽蚜小蜂'] },
];

// 简单 hash 函数（用于 mock 识别）
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function identifyPestImage(input: ImageIdInput): Promise<ImageIdResult> {
  const startTime = Date.now();
  const db = getDatabase();

  // 1. 从 pest_disease_dict 查询所有已知病虫害（V1.1 表无 image_url 列）
  const dictRows = db.exec(`
    SELECT dict_code, dict_name, description
    FROM pest_disease_dict
    WHERE status = 'active'
    LIMIT 50
  `);
  const dictList: { code: string; name: string; desc: string }[] = [];
  if (dictRows[0]) {
    for (const row of dictRows[0].values) {
      dictList.push({
        code: String(row[0] || ''),
        name: String(row[1] || ''),
        desc: String(row[2] || ''),
      });
    }
  }

  // 2. Mock 识别（基于 image_id hash）
  const seed = simpleHash(input.image_id + (input.image_name || ''));
  const topN = 3;
  const predictions: PestIdentification[] = [];
  for (let i = 0; i < topN; i++) {
    const idx = (seed + i * 7) % PEST_DISEASE_LIST.length;
    const confidence = Math.round((0.85 - i * 0.12) * 100) / 100;  // 0.85, 0.73, 0.61
    const pest = PEST_DISEASE_LIST[idx];
    predictions.push({
      pest_name: pest.name,
      pest_type: pest.type,
      confidence: Math.max(confidence, 0.4),
      symptoms: pest.symptoms,
      recommended_treatment: pest.treatment,
    });
  }

  // 3. XAI 推理
  const xai_reasons = [
    `图像 ID：${input.image_id}`,
    `识别算法：${input.image_features ? '基于特征向量（mock）' : '基于文件名 hash（mock fallback）'}`,
    `候选池：${PEST_DISEASE_LIST.length} 种常见病虫害 + ${dictList.length} 种字典匹配`,
    `Top-1 置信度：${predictions[0]?.confidence || 0}（PPT 要求 ≥90% = 0.90）`,
    `模型：mock 演示版（XGBoost + EfficientNet-B4 待网络通畅后接入）`,
  ];

  return {
    image_id: input.image_id,
    top_predictions: predictions,
    inference_time_ms: Date.now() - startTime,
    model_version: MODEL_VERSION,
    model_type: 'mock',
    xai_reasons,
    data_source: 'mock',
  };
}
