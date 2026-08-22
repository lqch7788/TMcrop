/**
 * AI-09 病虫害图像识别服务（模型端口预留版）
 * 2026-08-22：砍掉 hash mock 识别，接入真实 ONNX 模型端口
 *
 * 数据流：
 * 1. 前端上传图片 → 后端存盘（图片路径 image_path）
 * 2. 特征提取：待模型部署后由 ONNX 模型直接对图像张量推理
 *    （本版预留 image_features 特征向量输入，兼容"预处理 → 推理"两段式）
 * 3. 模型文件缺失 → 明确抛错并给出部署指引（Fail Loud，不 mock）
 *
 * 模型部署步骤（网络恢复后）：
 *   python tools/ml/export_pest_model.py   # 训练 EfficientNet-B4/CNN 并导出 ONNX
 *   将 pest_image.onnx 放入 server/models/ 目录，本服务自动启用真实推理
 */

import fs from 'fs';
import path from 'path';

const MODEL_PATH = path.join(__dirname, '../../../../models/pest_image.onnx');
const MODEL_VERSION = '1.0.0-ports';

interface ImageIdInput {
  image_id: string;                 // 图片 ID
  image_path?: string;              // 服务端图片文件路径（真实图片）
  crop_type?: string;               // 作物类型（缩小识别范围）
  image_features?: number[];        // 特征向量（预处理服务产出，维度与模型输入对齐）
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
  model_type: 'onnx-cnn';
  xai_reasons: string[];
  data_source: 'model';
}

/**
 * ONNX 模型推理（onnxruntime-node）
 * 模型未部署时抛明确错误；已部署时走真实推理
 */
async function runOnnxInference(features: number[]): Promise<number[]> {
  // 动态加载 onnxruntime（模型存在时才 require，避免无模型时启动失败）
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ort = require('onnxruntime-node');
  const session = await ort.InferenceSession.create(MODEL_PATH);
  const tensor = new ort.Tensor('float32', Float32Array.from(features), [1, features.length]);
  const outputs = await session.run({ input: tensor });
  const logits = Array.from(outputs[Object.keys(outputs)[0]].data as Float32Array);
  return logits;
}

/** softmax 归一化 → 置信度 */
function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

export async function identifyPestImage(input: ImageIdInput): Promise<ImageIdResult> {
  const startTime = Date.now();

  // 1. 检查模型是否部署（Fail Loud：未部署 → 明确报错，不做 mock）
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(
      '病虫害图像识别模型未部署（server/models/pest_image.onnx 缺失）。\n' +
      '部署步骤：\n' +
      '  1) 网络恢复后运行 python tools/ml/export_pest_model.py（训练 CNN 并导出 ONNX）\n' +
      '  2) 将 pest_image.onnx 放入 server/models/ 目录\n' +
      '  3) 重启 server，本接口自动启用真实模型推理',
    );
  }

  // 2. 特征输入校验：需要特征向量（模型输入）
  if (!input.image_features || input.image_features.length === 0) {
    throw new Error(
      '缺少 image_features 特征向量。模型部署后需先对图片做预处理（resize → normalize → 特征提取），' +
      '将特征向量传入本接口；或接入预处理服务直接传入图片张量',
    );
  }

  // 3. 真实模型推理 → top-3
  const logits = await runOnnxInference(input.image_features);
  const probs = softmax(logits);
  const top3Idx = probs
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 3);

  // 4. 分类名映射：从 pest_disease_dict 读取（真实字典）
  const { getDatabase } = await import('../../db');
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT dict_code, dict_name, description
    FROM pest_disease_dict WHERE status = 'active' ORDER BY dict_code
  `);
  const dictNames: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    dictNames.push(String(row.dict_name || ''));
  }
  stmt.free();

  const top_predictions: PestIdentification[] = top3Idx.map(({ p, i }) => {
    const name = dictNames[i] || `病虫害-类别${i}`;
    return {
      pest_name: name,
      pest_type: (name.includes('蚜') || name.includes('虱') || name.includes('螨')) ? 'pest' : 'disease',
      confidence: Math.round(p * 100) / 100,
      symptoms: [],
      recommended_treatment: [],
    };
  });

  // 5. XAI
  const xai_reasons = [
    `图片 ID：${input.image_id}`,
    `模型：onnx-cnn（pest_image.onnx）真实推理`,
    `Top-1 置信度：${top_predictions[0]?.confidence || 0}`,
    `候选池：${dictNames.length} 种字典病虫害类别`,
  ];

  return {
    image_id: input.image_id,
    top_predictions,
    inference_time_ms: Date.now() - startTime,
    model_version: MODEL_VERSION,
    model_type: 'onnx-cnn',
    xai_reasons,
    data_source: 'model',
  };
}
