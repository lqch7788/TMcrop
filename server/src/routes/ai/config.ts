/**
 * AI 模型/端口部署状态端点（PR-C）
 * 2026-08-24：前端 AIPanel 顶部"AI 模型部署状态"横幅数据源
 *
 * GET /api/ai/config/status
 *   返回 6 个 AI 模型/端口的部署状态
 *   - workhour：AI-06 工时预测 MLP（workhour_weights.json + workhour_meta.json）
 *   - pest_image：AI-09 病虫害图像识别 ONNX（pest_image.onnx）
 *   - whisper：AI-11 语音录入 ASR（whisper.onnx 或 AI_WHISPER_API_URL）
 *   - llm：AI-12 问答助手 LLM（AI_LLM_API_URL 环境变量）
 *   - anomaly_detection：AI-14 异常检测（规则引擎，无需模型）
 *   - attendance_detection：AI-15 出勤异常（规则引擎，无需模型）
 *
 * 响应格式：
 * {
 *   success: true,
 *   data: {
 *     overall: { deployed: 4, total: 6, percent: 67 },
 *     modules: [
 *       { code: 'workhour', name: 'AI-06 工时预测', deployed: true, type: 'ml', ... },
 *       { code: 'pest_image', name: 'AI-09 图像识别', deployed: false, type: 'onnx', ... },
 *       ...
 *     ],
 *   }
 * }
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

interface ModelStatus {
  code: string;
  name: string;
  deployed: boolean;
  type: 'ml' | 'onnx' | 'api' | 'rule';
  /** 人类可读的部署位置（如适用） */
  location?: string;
  /** 环境变量名（如适用） */
  envVar?: string;
  /** 缺失时的部署指南（点击横幅可展开） */
  setupGuide?: string;
}

/**
 * 检查本地模型文件是否存在
 * @param relativePath 相对于 server/ 的路径（如 'models/workhour_weights.json'）
 * __dirname = server/src/routes/ai/，需 ../../../ 共 3 层跳到 server/ 根
 */
function checkFile(relativePath: string): boolean {
  // 2026-08-25 fix：原用 4 层跳到 repo 根（V1.1/models/），应 3 层跳到 server/ 根
  const fullPath = path.join(__dirname, '../../..', relativePath);
  return fs.existsSync(fullPath);
}

function getModelStatuses(): ModelStatus[] {
  const workhourOk = checkFile('models/workhour_weights.json') && checkFile('models/workhour_meta.json');
  const pestImageOk = checkFile('models/pest_image.onnx');
  const whisperLocalOk = checkFile('models/whisper.onnx');
  const whisperApiOk = Boolean(process.env.AI_WHISPER_API_URL);
  const llmOk = Boolean(process.env.AI_LLM_API_URL);

  return [
    {
      code: 'workhour',
      name: 'AI-06 工时预测',
      deployed: workhourOk,
      type: 'ml',
      location: 'server/models/workhour_{weights,meta}.json',
      setupGuide: workhourOk
        ? undefined
        : '1) cd server\n2) python tools/ml/train_workhour_mlp.py\n3) 重启 server',
    },
    {
      code: 'pest_image',
      name: 'AI-09 病虫害图像识别',
      deployed: pestImageOk,
      type: 'onnx',
      location: 'server/models/pest_image.onnx',
      setupGuide: pestImageOk
        ? undefined
        : '1) python tools/ml/generate_synthetic_images.py（生成 5500 张合成图）\n2) python tools/ml/train_pest_image_cnn.py（训练 CNN + 导出 ONNX）\n3) 重启 server',
    },
    {
      code: 'whisper',
      name: 'AI-11 语音录入 ASR',
      deployed: whisperLocalOk || whisperApiOk,
      type: 'onnx',
      location: whisperLocalOk ? 'server/models/whisper.onnx' : undefined,
      envVar: whisperApiOk ? 'AI_WHISPER_API_URL' : 'AI_WHISPER_API_URL',
      setupGuide: (whisperLocalOk || whisperApiOk)
        ? undefined
        : '方案 A（推荐）：在 .env 配置 AI_WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions + AI_WHISPER_API_KEY\n方案 B：本地部署 whisper.onnx（参考 docs/deploy-ai-models.md）',
    },
    {
      code: 'llm',
      name: 'AI-12 问答助手 LLM',
      deployed: llmOk,
      type: 'api',
      envVar: 'AI_LLM_API_URL',
      setupGuide: llmOk
        ? undefined
        : '在 .env 配置 AI_LLM_API_URL（OpenAI / DeepSeek / Ollama 等兼容 API）+ AI_LLM_API_KEY',
    },
    {
      code: 'anomaly_detection',
      name: 'AI-14 异常检测',
      deployed: true,
      type: 'rule',
      location: 'server/src/services/ai/anomaly.ts（Z-score + IQR 内置）',
    },
    {
      code: 'attendance_detection',
      name: 'AI-15 出勤异常',
      deployed: true,
      type: 'rule',
      location: 'server/src/services/ai/attendance.ts（滑动窗口规则内置）',
    },
  ];
}

router.get('/status', (_req: Request, res: Response) => {
  try {
    const modules = getModelStatuses();
    const deployed = modules.filter((m) => m.deployed).length;
    const total = modules.length;
    return res.json({
      success: true,
      data: {
        overall: { deployed, total, percent: Math.round((deployed / total) * 100) },
        modules,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || '查询失败' });
  }
});

export default router;
