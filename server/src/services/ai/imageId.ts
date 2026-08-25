/**
 * AI-09 病虫害图像识别服务（V2 — PyTorch .pt + Python spawn fallback）
 * 2026-08-22：P1 MVP（ONNX 模型端口预留版）
 * 2026-08-25 fix：增加 PyTorch .pt 模型 spawn Python 推理支持
 *   （onnxscript 装不上时 fallback，避免横幅永远 ❌）
 *
 * 数据流：
 * 1. 前端上传图片 → 后端存盘（图片路径 image_path）
 * 2. 推理优先级：ONNX 模型（onnxruntime-node）→ PyTorch .pt（spawn Python）
 * 3. 模型文件都缺失 → 明确抛错并给出部署指引（Fail Loud，不 mock）
 *
 * 模型部署：
 *   cd server && python tools/ml/train_pest_image_cnn.py
 *   → 自动生成 models/pest_image.pt（PyTorch 权重）→ AI-09 立即可用
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const SERVER_ROOT = path.join(__dirname, '../../../../');
const ONNX_MODEL_PATH = path.join(SERVER_ROOT, 'models', 'pest_image.onnx');
const PT_MODEL_PATH = path.join(SERVER_ROOT, 'models', 'pest_image.pt');
const PREDICT_SCRIPT = path.join(SERVER_ROOT, 'tools', 'ml', 'predict_pest_image.py');
const MODEL_VERSION = '1.0.0-cnn-synthetic';

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
 * PyTorch .pt 模型推理（spawn Python，2026-08-25 fix）
 * 当 ONNX 导出失败时（onnxscript 装不上），训练脚本会 fallback 生成 .pt 模型，
 * 这里通过 Python 子进程加载 .pt 并推理图片。
 */
function runPtInference(filePath: string): Promise<ImageIdResult> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(PREDICT_SCRIPT)) {
      reject(new Error(`推理脚本不存在: ${PREDICT_SCRIPT}`));
      return;
    }
    const py = spawn('python', [PREDICT_SCRIPT], {
      cwd: SERVER_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });
    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python 推理退出码 ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      try {
        const pyResult = JSON.parse(stdout);
        if (!pyResult.success) {
          reject(new Error(pyResult.error || 'Python 推理失败'));
          return;
        }
        resolve(pyResult.data as ImageIdResult);
      } catch (e: any) {
        reject(new Error(`解析 Python 输出失败: ${e.message} | 输出: ${stdout.slice(0, 200)}`));
      }
    });
    py.on('error', (err) => reject(err));
    // 把图片 base64 写入 Python stdin
    try {
      const imgBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
      py.stdin.write(imgBase64);
      py.stdin.end();
    } catch (e: any) {
      reject(new Error(`读取图片文件失败: ${e.message}`));
    }
  });
}

/**
 * ONNX 模型推理（onnxruntime-node）
 * 模型未部署时抛明确错误；已部署时走真实推理
 */
async function runOnnxInference(features: number[]): Promise<number[]> {
  // 动态加载 onnxruntime（模型存在时才 require，避免无模型时启动失败）
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ort = require('onnxruntime-node');
  const session = await ort.InferenceSession.create(ONNX_MODEL_PATH);
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

  // 1. 检查模型部署（2026-08-25 fix：兼容 .onnx 和 .pt 两种格式）
  // 路径优先级：PyTorch .pt（已训练）→ ONNX .onnx
  const ptExists = fs.existsSync(PT_MODEL_PATH);
  const onnxExists = fs.existsSync(ONNX_MODEL_PATH);
  if (!ptExists && !onnxExists) {
    throw new Error(
      '病虫害图像识别模型未部署（server/models/pest_image.onnx 和 pest_image.pt 都缺失）。\n' +
      '部署步骤：\n' +
      '  cd server && python tools/ml/train_pest_image_cnn.py\n' +
      '  → 自动生成 models/pest_image.pt，本接口立即可用真实推理',
    );
  }

  // 2. 路径 1：PyTorch .pt（spawn Python，2026-08-25 PR-C）
  if (ptExists && input.image_path) {
    return await runPtInference(input.image_path);
  }

  // 3. 路径 2：ONNX 模型（onnxruntime-node）
  // 特征输入校验：需要特征向量
  if (!input.image_features || input.image_features.length === 0) {
    throw new Error(
      '病虫害图像识别需要图片（image_path 用于 .pt 推理 或 image_features 用于 .onnx 推理）。\n' +
      '请确保：1) 调用 /api/ai/image/upload 上传图片 → 返回 image_id + file_path\n' +
      '          2) 调 /api/ai/image/identify 时直接传 image_id（推荐，自动用 .pt）\n' +
      '          3) 或在调用前自己预处理图片 → 传 image_features',
    );
  }
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
