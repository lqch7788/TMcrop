/**
 * AI-05 病虫害智能预警服务（真实数据版）
 * 2026-08-22：砍掉 mock 环境数据，接入真实 IoT 传感器读数
 *
 * 数据流：前端传 greenhouse_id → iot_sensor_readings 最近 24h 真实聚合 → 规则引擎 → 预警
 * - 环境数据缺失 / 温室无传感器 → 明确抛错（Fail Loud，不再 mock 降级）
 * - 规则引擎为真实农业植保规则（温度/湿度与病虫害发生的专业阈值）
 */

import { getDatabase } from '../../db';

interface PestAlertInput {
  crop_type: string;               // 必填
  greenhouse_id: string;           // 必填（IoT 数据按温室查询）
  history_days?: number;           // 历史预警查询天数（保留接口）
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
  model_type: 'rule-based';
  xai_reasons: string[];
  data_source: 'iot_sensors';
}

const MODEL_VERSION = '1.0.1-real-iot';

// 病虫害风险规则（真实植保阈值，与 V1.1 usePestAlert.ts 的 PEST_ALERT_RULES 同源）
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
    actions: ['释放瓢虫天敌', '悬挂黄板诱杀', '喷施吡虫啉'],
  },
  {
    pest: '红蜘蛛',
    condition: (temp, hum) => (temp >= 25 && hum <= 50 ? 75 : (temp >= 22 && hum <= 60 ? 40 : 15)),
    actions: ['增加空气湿度', '释放捕食螨', '喷施阿维菌素'],
  },
];

/** 查询温室最近 24h 真实传感器聚合值（prepare + bind，中文/特殊 ID 安全） */
function queryEnvSnapshot(greenhouseId: string): { temp: number; hum: number; light: number; co2: number; soil: number } | null {
  const db = getDatabase();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const stmt = db.prepare(`
    SELECT sensor_type, AVG(value) AS avg_val, COUNT(*) AS n
    FROM iot_sensor_readings
    WHERE greenhouse_id = ? AND recorded_at >= ?
    GROUP BY sensor_type
  `);
  stmt.bind([greenhouseId, since]);
  const agg: Record<string, number> = {};
  let total = 0;
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const sensorType = String(row.sensor_type || '');  // sql.js 返回 Uint8Array|null，需转字符串
    if (!sensorType) continue;
    agg[sensorType] = Number(row.avg_val) || 0;
    total += Number(row.n) || 0;
  }
  stmt.free();
  if (total === 0) return null;

  return {
    temp: agg.temperature ?? 0,
    hum: agg.humidity ?? 0,
    light: agg.light ?? 0,
    co2: agg.co2 ?? 0,
    soil: agg.soil_moisture ?? 0,
  };
}

export async function predictPestAlert(input: PestAlertInput): Promise<PestAlertResult> {
  const db = getDatabase();

  // 1. 环境数据：只读真实 IoT 传感器（无数据 → 明确抛错，不做 mock 降级）
  if (!input.greenhouse_id) {
    throw new Error('病虫害预警必须提供 greenhouse_id（温室）参数');
  }
  // 校验温室存在
  const ghStmt = db.prepare('SELECT id, name, crop FROM greenhouses WHERE id = ? LIMIT 1');
  ghStmt.bind([input.greenhouse_id]);
  const hasGh = ghStmt.step();
  const ghRow = hasGh ? ghStmt.getAsObject() : null;
  const ghName = ghRow ? String(ghRow.name || input.greenhouse_id) : input.greenhouse_id;
  ghStmt.free();
  if (!hasGh) {
    throw new Error(`温室 ${input.greenhouse_id} 不存在，请检查 greenhouse_id 参数`);
  }

  // 2026-08-24 PR3：缺 crop_type 时，从该温室当前种植作物反查（替换前端硬编码 '番茄'）
  // 优先级：input.crop_type → greenhouses.crop → plantings 当前在种作物
  let cropType = input.crop_type;
  if (!cropType) {
    if (ghRow?.crop) {
      cropType = String(ghRow.crop);
    } else {
      const plantStmt = db.prepare(`
        SELECT crop_name FROM plantings
        WHERE greenhouse_name = ? AND status = 'growing'
        ORDER BY planting_date DESC LIMIT 1
      `);
      plantStmt.bind([ghName]);
      if (plantStmt.step()) {
        const cropName = plantStmt.getAsObject().crop_name;
        if (cropName) cropType = String(cropName);
      }
      plantStmt.free();
    }
    if (!cropType) {
      throw new Error(
        `温室 ${ghName}（${input.greenhouse_id}）未提供 crop_type，且无法从 greenhouses.crop 或 plantings 当前批次反查到作物名。` +
        '请前端传 crop_type 或在温室/种植表中补充当前作物',
      );
    }
  }

  const snapshot = queryEnvSnapshot(input.greenhouse_id);
  if (!snapshot) {
    throw new Error(
      `温室 ${ghName}（${input.greenhouse_id}）最近 24h 无环境传感器数据（iot_sensor_readings 为空）。` +
      '请确认：1) 传感器已部署并上报数据 2) 数据写入 iot_sensor_readings 表',
    );
  }
  if (snapshot.temp === 0 || snapshot.hum === 0) {
    throw new Error(`温室 ${ghName} 缺少温度/湿度传感器数据（当前仅有 ${['temp', 'hum', 'light', 'co2', 'soil'].filter(k => (snapshot as any)[k] !== 0).join(',')}），无法执行病虫害规则判断`);
  }
  const env = {
    temperature: snapshot.temp,
    humidity: snapshot.hum,
    light: snapshot.light,
    co2: snapshot.co2,
    soil_moisture: snapshot.soil,
  };

  // 2. 规则引擎计算各病虫害风险（真实植保规则）
  const alerts: PestAlert[] = [];
  const allActions = new Set<string>();

  for (const rule of PEST_RULES) {
    const score = rule.condition(env.temperature, env.humidity);
    if (score >= 40) {  // 阈值：≥40 才告警
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
    `环境快照（温室 ${ghName} 最近 24h 真实传感器均值）：温度 ${env.temperature.toFixed(1)}℃ / 湿度 ${env.humidity.toFixed(1)}% / 光照 ${(env.light / 1000).toFixed(0)}K lux / CO2 ${env.co2.toFixed(0)}ppm`,
    `触发规则数：${alerts.length}（真实植保阈值规则集）`,
    `总体风险评分：${overallScore}/100`,
    '数据源：iot_sensor_readings 真实传感器数据',
  ];

  return {
    greenhouse_id: input.greenhouse_id,
    crop_type: cropType,
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
    data_source: 'iot_sensors',
  };
}
