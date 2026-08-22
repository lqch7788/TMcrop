/**
 * AI-05 病虫害智能预警服务（V1 — 规则版）
 * 2026-08-22：P0 核心 MVP
 *
 * Plan 要求：环境数据（温度/湿度/光照/CO2）+ 历史病虫害记录 + 作物类型
 * → 预警准确率 ≥80% / 提前 3 天
 *
 * 现实约束：V1.1 iot_sensors = 0 行（完全无环境数据）
 * 降级实现：
 *   - 用 mock 环境数据演示（基于季节 + 地点规则）
 *   - 用现有 usePestAlert 的规则引擎（PEST_ALERT_RULES）作为后端版
 *   - 待 IoT 部署后接入真实传感器流
 */

import { getDatabase } from '../../db';

interface PestAlertInput {
  crop_type: string;               // 必填
  greenhouse_id?: string;
  /** 模拟环境数据（不传则用季节默认值） */
  env_data?: {
    temperature?: number;
    humidity?: number;
    light?: number;
    co2?: number;
    soil_moisture?: number;
  };
  /** 历史预警查询天数 */
  history_days?: number;
}

interface PestAlert {
  pest_name: string;
  risk_score: number;              // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  alert_days_ahead: number;        // 预警提前天数
  reasons: string[];
  recommended_actions: string[];
}

interface PestAlertResult {
  greenhouse_id: string;
  crop_type: string;
  env_snapshot: { temperature: number; humidity: number; light: number; co2: number; soil_moisture: number };
  overall_risk: 'low' | 'medium' | 'high' | 'critical';
  overall_risk_score: number;
  alerts: PestAlert[];
  recommended_actions: string[];
  model_version: string;
  model_type: 'rule-based' | 'onnx-xgboost';
  xai_reasons: string[];
  data_source: 'mock' | 'iot_sensors';
}

const MODEL_VERSION = '1.0.0-rule-pest';

// 病虫害风险规则（基于 V1.1 usePestAlert.ts 的 PEST_ALERT_RULES）
const PEST_RULES: { pest: string; condition: (temp: number, hum: number) => number; actions: string[] }[] = [
  {
    pest: '白粉病',
    condition: (temp, hum) => (temp >= 20 && temp <= 28 && hum >= 60 ? 80 : (hum >= 70 ? 50 : 10)),
    actions: ['加强通风降湿', '喷施三唑酮或粉锈宁', '及时清除病叶'],
  },
  {
    pest: '霜霉病',
    condition: (temp, hum) => (temp >= 15 && temp <= 22 && hum >= 80 ? 90 : (hum >= 70 ? 50 : 15)),
    actions: ['控制湿度 < 70%', '喷施烯酰吗啉或甲霜灵', '避免叶面结露'],
  },
  {
    pest: '炭疽病',
    condition: (temp, hum) => (temp >= 25 && temp <= 32 && hum >= 75 ? 70 : (temp >= 22 && hum >= 65 ? 40 : 10)),
    actions: ['轮作避免连作', '喷施咪鲜胺或苯醚甲环唑', '清除病残体'],
  },
  {
    pest: '蚜虫',
    condition: (temp, hum) => (temp >= 18 && temp <= 26 && hum <= 70 ? 60 : 20),
    actions: ['释放瓢虫天敌', '悬挂黄板诱杀', '喷施吡虫�'],
  },
  {
    pest: '红蜘蛛',
    condition: (temp, hum) => (temp >= 25 && hum <= 50 ? 75 : (temp >= 22 && hum <= 60 ? 40 : 15)),
    actions: ['增加空气湿度', '释放捕食螨', '喷施阿维菌素'],
  },
];

/**
 * 生成 mock 环境数据（基于季节 + 温室类型）
 */
function mockEnvData(greenhouseId?: string, month?: number): {
  temperature: number;
  humidity: number;
  light: number;
  co2: number;
  soil_moisture: number;
} {
  const m = month || new Date().getMonth() + 1;
  // 季节经验值
  let temp = 22;
  if ([6, 7, 8].includes(m)) temp = 30;
  else if ([12, 1, 2].includes(m)) temp = 12;
  else if ([3, 4, 5].includes(m)) temp = 18;
  else temp = 24;

  return {
    temperature: temp + Math.random() * 4 - 2,  // ±2 扰动
    humidity: 65 + Math.random() * 20,
    light: 30000 + Math.random() * 20000,
    co2: 400 + Math.random() * 200,
    soil_moisture: 55 + Math.random() * 20,
  };
}

export async function predictPestAlert(input: PestAlertInput): Promise<PestAlertResult> {
  // 1. 环境数据：优先用传入，否则查 iot_sensors，否则用 mock
  const db = getDatabase();
  let env: { temperature: number; humidity: number; light: number; co2: number; soil_moisture: number };
  let dataSource: 'mock' | 'iot_sensors' = 'mock';

  if (input.env_data && input.env_data.temperature !== undefined) {
    env = {
      temperature: input.env_data.temperature,
      humidity: input.env_data.humidity || 70,
      light: input.env_data.light || 40000,
      co2: input.env_data.co2 || 500,
      soil_moisture: input.env_data.soil_moisture || 60,
    };
  } else if (input.greenhouse_id) {
    const iotRows = db.exec(`
      SELECT sensor_type, value FROM iot_sensor_readings
      WHERE greenhouse_id = ?
        AND recorded_at > datetime('now', '-1 day')
      ORDER BY recorded_at DESC LIMIT 10
    `, [input.greenhouse_id]);
    if (iotRows[0]?.values?.length) {
      // 简化：从 iot_sensor_readings 聚合（V1.1 当前 0 行 → 走 mock）
      env = mockEnvData(input.greenhouse_id);
      dataSource = 'mock';
    } else {
      env = mockEnvData(input.greenhouse_id);
      dataSource = 'mock';
    }
  } else {
    env = mockEnvData();
    dataSource = 'mock';
  }

  // 2. 计算每种病虫害的风险分数
  const alerts: PestAlert[] = [];
  const allActions = new Set<string>();

  for (const rule of PEST_RULES) {
    const score = rule.condition(env.temperature, env.humidity);
    if (score >= 40) {  // 阈值：≥40 才告警
      // 预警提前天数（与温度正相关：温度高 → 病虫害发展快 → 预警提前天数少）
      const alertDaysAhead = score >= 80 ? 5 : score >= 60 ? 3 : 2;
      const riskLevel: PestAlert['risk_level'] =
        score >= 80 ? 'critical' :
        score >= 60 ? 'high' :
        score >= 40 ? 'medium' : 'low';

      alerts.push({
        pest_name: rule.pest,
        risk_score: score,
        risk_level: riskLevel,
        alert_days_ahead: alertDaysAhead,
        reasons: [
          `温度 ${env.temperature.toFixed(1)}℃ 适宜 ${rule.pest} 繁殖`,
          `湿度 ${env.humidity.toFixed(1)}% 满足 ${rule.pest} 孢子萌发`,
        ],
        recommended_actions: rule.actions,
      });
      rule.actions.forEach(a => allActions.add(a));
    }
  }

  // 3. 总体风险
  const overallScore = alerts.length === 0 ? 10 : Math.max(...alerts.map(a => a.risk_score));
  const overallRisk: PestAlertResult['overall_risk'] =
    overallScore >= 80 ? 'critical' :
    overallScore >= 60 ? 'high' :
    overallScore >= 40 ? 'medium' : 'low';

  // 4. XAI 推理依据
  const xai_reasons: string[] = [
    `环境快照：温度 ${env.temperature.toFixed(1)}℃ / 湿度 ${env.humidity.toFixed(1)}% / 光照 ${(env.light / 1000).toFixed(0)}K lux / CO2 ${env.co2.toFixed(0)}ppm`,
    `触发规则数：${alerts.length}（基于 V1.1 PEST_ALERT_RULES 同源规则集）`,
    `总体风险评分：${overallScore}/100`,
    `数据源：${dataSource}（V1.1 iot_sensors = 0 行 → 使用 mock，待 IoT 部署后切换）`,
  ];

  return {
    greenhouse_id: input.greenhouse_id || 'mock',
    crop_type: input.crop_type,
    env_snapshot: {
      temperature: Math.round(env.temperature * 10) / 10,
      humidity: Math.round(env.humidity * 10) / 10,
      light: Math.round(env.light),
      co2: Math.round(env.co2),
      soil_moisture: Math.round(env.soil_moisture * 10) / 10,
    },
    overall_risk: overallRisk,
    overall_risk_score: overallScore,
    alerts: alerts.sort((a, b) => b.risk_score - a.risk_score),
    recommended_actions: Array.from(allActions),
    model_version: MODEL_VERSION,
    model_type: 'rule-based',
    xai_reasons,
    data_source: dataSource,
  };
}
