# M1.5 数据准备 SOP

> **Status**: 🚧 准备阶段（2026-08-22）
> **目标**: 在 Phase 2 启动前达成 Gate G1 数据基线
> **依赖**: 网络通畅时执行（当前代理阻断 PyPI/数据集下载）

---

## 一、目标（Gate G1）

| 指标 | 当前 | 目标 |
|---|---|---|
| 病虫害图片 | 2 张 | **≥2000 张** |
| 标注准确率 | N/A | **≥95%** |
| 历史任务数据 | 84 行（5 月）| **≥500 行** |
| 员工历史 | 6 人 | **≥6 人 + 历史录入 500+ 行** |
| 环境传感器数据 | 0 行 | **≥90 天历史 + 实时流** |

---

## 二、病虫害图片采集

### 2.1 公开数据集清单（按推荐顺序）

| # | 数据集 | 数量 | 类型 | URL | 版权 |
|---|---|---|---|---|---|
| 1 | **PlantVillage** | 54,305 张 | 38 类病害 + 12 类健康 | https://data.mendeley.com/datasets/tywbtsjrjy/3 | CC-BY |
| 2 | **PlantWild 多病害** | 10,000+ 张 | 多作物病害 | https://github.com/PlntDoc/PlantWild-Disease | 学术 |
| 3 | **AI Challenger 农业病害** | 27,000 张 | 10 类常见病害 | https://aistudio.baidu.com/datasetdetail/13537 | 学术 |
| 4 | **iNaturalist 病害** | 100,000+ 张 | 自然场景病害 | https://www.inaturalist.org/observations | CC-BY-NC |
| 5 | **CDDB 中国果蔬病害** | 5,000+ 张 | 国内作物 | https://github.com/xinyu1205/Recognize-Plant-Diseases | MIT |

**建议组合**：PlantVillage（80% 基础）+ AI Challenger（国内作物）+ iNaturalist（自然场景增强）

### 2.2 自标注流程（SOP）

**Step 1**：Label Studio 部署（30 分钟）

```bash
# Docker 方式（推荐）
docker run -it -p 8234:8083 \
  -v /path/to/data:/label-studio/data \
  heartexlabs/label-studio:latest

# 打开 http://localhost:8234
```

**Step 2**：标注配置（XML/JSON）

```xml
<View>
  <Image name="image" value="$image"/>
  <Choices name="pest_type" toName="image">
    <Choice value="白粉病"/>
    <Choice value="霜霉病"/>
    <Choice value="炭疽病"/>
    <!-- ... 50+ 类别 -->
  </Choices>
  <Header value="请框选病灶区域"/>
  <RectangleLabels name="病灶" toName="image">
    <Label value="叶部"/>
    <Label value="茎部"/>
    <Label value="果实"/>
  </RectangleLabels>
</View>
```

**Step 3**：双人盲标 + 质检

- 每张图 2 人独立标
- Cohen's Kappa ≥0.85 一致性通过
- 不一致 → 专家终审
- 抽样 5% 二次质检

**Step 4**：导出格式

```python
# 导出 COCO 格式（用于 ONNX 训练）
{
  "images": [{"id": 1, "file_name": "img001.jpg", "width": 1024, "height": 768}],
  "annotations": [{"id": 1, "image_id": 1, "category_id": 5, "bbox": [100, 200, 300, 250]}],
  "categories": [{"id": 1, "name": "白粉病"}, ...]
}
```

### 2.3 下载脚本（等网络通畅时执行）

```bash
# 下载脚本位置：server/tools/ml/download_datasets.py
cd D:/TMcrop/yuanxingtu/V1.1/server
python tools/ml/download_datasets.py --dataset plantvillage --output data/images/plantvillage/
```

---

## 三、历史任务数据扩充

### 3.1 V1.1 现状

- farm_tasks: **84 行**（2026-03-16 ~ 2026-08-21）
- 已完成: **9 行**（完成度 ≥99%）
- 有 actual_hours 字段：**刚迁移加（2026-08-22）**

### 3.2 扩充路径

**路径 A：手工回溯录入**（推荐）

- 6 名员工各自录入过去 2 年的关键任务
- 格式：CSV / Web 表单
- 工作量：6 人 × 5 天 × 50 行/天 = **1500 行**
- 成本：6 × 5 × 200 元 = **6000 元**

**路径 B：公开数据集**

- CGIAR 大田试验数据（含任务记录）
- Kaggle 农业任务数据集
- 阿里云天池农业 AI 比赛

### 3.3 录入表单（待前端开发）

```tsx
// src/components/farm-task/ActualHoursForm.tsx
<Form onFinish={(values) => api.updateTask(taskId, { actual_hours: values.hours })}>
  <Form.Item name="hours" label="实际工时（小时）" rules={[{ required: true, min: 0.1 }]}>
    <InputNumber step={0.1} />
  </Form.Item>
  <Form.Item name="notes" label="备注（可选）">
    <TextArea rows={2} placeholder="如：超时原因、特殊情况..." />
  </Form.Item>
  <Button type="primary" htmlType="submit">提交</Button>
</Form>
```

---

## 四、环境数据采集

### 4.1 V1.1 现状

- iot_sensors: **0 行**（V1.1 完全无 IoT）
- daily_records: **无环境字段**（温度/湿度/光照/CO2 全部缺失）

### 4.2 IoT 硬件询价清单

| 设备 | 数量 | 单价 | 总价 | 供应商 |
|---|---|---|---|---|
| 温湿度传感器（DHT22）| 21 | 80 元 | 1680 元 | 淘宝/立创商城 |
| 土壤湿度传感器（RS485）| 21 | 120 元 | 2520 元 | 同上 |
| 4G IoT 网关 | 1 | 1500 元 | 1500 元 | 同上 |
| 安装调试（21 温室 × 2 工时）| 42 工时 | 80 元 | 3360 元 | 内部 |
| **合计** | — | — | **~9060 元** | — |

### 4.3 数据流架构（IoT 部署后）

```
21 温室 × 2 传感器 → 4G 网关 → MQTT → Node 后端 /api/iot/ingest
                                              ↓
                                       iot_sensor_readings（新增表）
                                              ↓
                                    daily_records 环境字段（已加）
                                              ↓
                                  AI-05 病虫害预警（依赖环境数据）
```

---

## 五、IoT 传感器数据 schema（待建）

```sql
CREATE TABLE iot_sensor_readings (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,                -- 设备 ID
  sensor_type TEXT NOT NULL,               -- 'temperature'|'humidity'|'soil_moisture'|'light'|'co2'
  value REAL NOT NULL,                     -- 测量值
  unit TEXT,                               -- '℃'|'%'|'ppm'|'lux'
  recorded_at TEXT NOT NULL,               -- 测量时间
  greenhouse_id TEXT,                      -- 关联 greenhouse
  received_at TEXT NOT NULL,               -- 后端接收时间
  FOREIGN KEY (greenhouse_id) REFERENCES greenhouses(id)
);

CREATE INDEX idx_isr_device_time ON iot_sensor_readings(device_id, recorded_at);
CREATE INDEX idx_isr_greenhouse_time ON iot_sensor_readings(greenhouse_id, recorded_at);
```

---

## 六、执行路线（2-3 周）

### Week 1（并行启动）
| 轨道 | 任务 | 责任人 |
|---|---|---|
| **图片公开数据集** | 等网络通畅后下载 PlantVillage + AI Challenger | AI 团队 |
| **自标注环境** | 部署 Label Studio + 标注 SOP 培训 | AI + 农技专家 |
| **历史回溯** | 6 员工各自录入 50+ 任务 | 农场全员 |
| **IoT 询价** | 21 温室 × 2 传感器报价单 | 采购 |

### Week 2-3
| 任务 | 交付物 |
|---|---|
| 图片标注完成 | 2000+ 张 ≥95% 准确率 |
| 历史录入完成 | 500+ 行任务 |
| IoT 部署 | 21 温室 × 2 传感器上线 |
| 环境数据流 | 实时接入 V1.1 daily_records |

### Gate G1 验收（W5 末）
- [ ] 图片 ≥2000 张
- [ ] 任务 ≥500 行
- [ ] 员工 ≥6 人
- [ ] 环境数据 ≥90 天历史

---

## 七、依赖与风险

| 依赖 | 状态 | 备用方案 |
|---|---|---|
| 网络通畅 | ❌ 当前代理阻断 | 手动下载 + 拷贝 |
| Label Studio 部署 | �️ 需 Docker 环境 | 用 Label Studio Web SaaS |
| 6 员工配合度 | ⚠️ 需领导协调 | 奖金激励 / 强制排期 |
| IoT 硬件采购 | ⚠️ 需 9060 元预算 | 二手设备 / 分批采购 |

---

## 八、相关文件

- `server/src/db/migrations/2026-08-22-add-actual-hours-to-farm-tasks.sql`（已实施 ✅）
- `server/tools/ml/train_workhour_baseline.py`（baseline 验证 ✅，MAPE 33.61%）
- `server/tools/ml/output/baseline_report.json`（评估报告）
- `server/docs/ai/AI-06-workhour-design.md`（技术设计 ✅）

---

## 九、下一步

✅ M1.5 数据准备框架已建立  
⏳ 等待用户决定何时执行实际下载/录入/IoT 采购

**用户选择**：
- **A**：先做前端"实际工时录入"页面（员工填 actual_hours）—— 立刻能采集真实数据
- **B**：写公开数据集下载脚本（等网络通畅时跑）—— 准备 2000+ 张图片
- **C**：写 IoT 数据接入模拟脚本（先 fake 数据流，验证 schema）—— AI-05 准备
- **D**：先实施 AI-06 Node 推理端点（用 baseline 模型 + 等数据扩充后切换）—— 抢占时间
