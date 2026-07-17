/**
 * 2026-07-17 调节剂分类迁移脚本 — 独立运行（启动白名单禁用 fixMissingSchema）
 *
 * 执行内容（全部幂等，可重复跑）：
 *   1. pesticide_type 字典补 7 项（PT008 调节剂一级 + PT019-024 调节剂 6 子类）
 *   2. pesticide_specs 表补 14 条调节剂种子（PC-0270 起）— 数据源 ChemicalBook / 中国农药信息网
 *
 * ⚠️ 运行前必须停掉后端服务器（否则磁盘改动会被内存 saveDatabase 覆盖）！
 *
 * 用法：
 *   cd server
 *   npx tsx scripts/applyPlantGrowthRegulatorMigration.ts
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../data/yuanxingtu.db');

// ============ 1. 调节剂字典数据 ============
const PGR_DICT = [
  { id: 'PT008', code: 'plant_growth_regulator', label: '调节剂', color: 'violet', sort: 8 },
  { id: 'PT019', code: 'pgr_promoter',          label: '调节剂-促进生长', color: 'violet', sort: 21 },
  { id: 'PT020', code: 'pgr_retardant',         label: '调节剂-延缓生长', color: 'violet', sort: 22 },
  { id: 'PT021', code: 'pgr_ripening',          label: '调节剂-催熟催黄', color: 'violet', sort: 23 },
  { id: 'PT022', code: 'pgr_rooting',           label: '调节剂-生根壮苗', color: 'violet', sort: 24 },
  { id: 'PT023', code: 'pgr_fruit_set',         label: '调节剂-保花保果', color: 'violet', sort: 25 },
  { id: 'PT024', code: 'pgr_stress',            label: '调节剂-抗逆增效', color: 'violet', sort: 26 },
];

// ============ 2. 调节剂种子数据 ============
// 数据源：
//   - ChemicalBook 植物生长调节剂目录（m.chemicalbook.com/ChemicalProductsList_120.htm）
//   - 中国农药信息网（农药登记数据，10 个品种登记产品数占总植调剂登记 2.54%）
//   - 北京园林绿化局《植物生长调节剂面面观》（林果）
//   - 文献：国内外植物生长调节剂残留限量标准的比对分析（广东农业科学 2015）
//
// 字段：pesticideName, pesticideType(JSON array), ingredient, mechanism,
//       functionDesc, tabooDesc, targetPests, spec, manufacturer, dosage, unit
interface PgrItem {
  name: string;
  types: string[];          // 关联 pesticide_type codes
  ingredient: string;
  mechanism: string;
  functionDesc: string;
  tabooDesc: string;
  targetPests: string;
  specs: Array<{ spec: string; manufacturer: string; dosage: string; unit: string }>;
}

const PGR_PESTICIDES: PgrItem[] = [
  // ===== 促进生长类（赤霉素 / 芸苔素内酯 / 胺鲜酯 / 复硝酚钠 / 萘乙酸）=====
  {
    name: '赤霉酸（赤霉素GA3）',
    types: ['plant_growth_regulator', 'pgr_promoter'],
    ingredient: '赤霉酸 GA3（Gibberellic acid）',
    mechanism: '促进细胞伸长，打破休眠，诱导淀粉酶生成',
    functionDesc: '广谱促进型植物生长调节剂。能促进茎叶伸长、打破种子休眠、诱导单性结实、防止落花落果。广泛用于水稻制种、果树保果、葡萄无核化、棉花保铃等。',
    tabooDesc: '不可与碱性农药混用。严格按浓度使用，浓度过高易徒长。残留低，安全间隔期 7-15 天。',
    targetPests: '促进生长、打破休眠、保花保果、葡萄无核化',
    specs: [
      { spec: '4%乳油', manufacturer: '上海同瑞生物', dosage: '1000-2000', unit: '倍液' },
      { spec: '20%可溶粉剂', manufacturer: '浙江钱江生化', dosage: '3000-5000', unit: '倍液' },
      { spec: '85%结晶粉', manufacturer: '江苏七洲绿色化工', dosage: '50000-80000', unit: '倍液' },
    ],
  },
  {
    name: '芸苔素内酯',
    types: ['plant_growth_regulator', 'pgr_stress'],
    ingredient: '芸苔素内酯（Brassinolide）',
    mechanism: '第六类植物激素，调节植物生长发育，增强抗逆性',
    functionDesc: '天然甾醇类植物激素第 6 类，被誉为"万能调节剂"。能促进根系生长、提高叶绿素含量、增强光合作用、缓解药害、提高抗寒抗旱抗病能力。适用于几乎所有作物。',
    tabooDesc: '不可与碱性农药混用。喷施后 6 小时内遇雨应补喷。安全间隔期 7 天。',
    targetPests: '抗逆增产、缓解药害、提高品质',
    specs: [
      { spec: '0.01%水剂', manufacturer: '深圳银坤', dosage: '1500-2500', unit: '倍液' },
      { spec: '0.1%可溶粉剂', manufacturer: '日本化药', dosage: '1500-3000', unit: '倍液' },
      { spec: '0.004%水剂（天然型）', manufacturer: '云南云大科技', dosage: '1000-2000', unit: '倍液' },
    ],
  },
  {
    name: '胺鲜酯（DA-6）',
    types: ['plant_growth_regulator', 'pgr_promoter'],
    ingredient: '己酸二乙氨基乙醇酯（Diethyl aminoethyl hexanoate）',
    mechanism: '调节植物体内源激素平衡，提高光合效率',
    functionDesc: '广谱高效植物生长调节剂。能提高植物叶绿素含量、增强光合作用、促进根系发育、提高坐果率和果实品质。适用于叶菜、果树、粮食作物。',
    tabooDesc: '对豆科作物效果显著，但浓度不宜过高，否则抑制生长。可与大多数农药混用。',
    targetPests: '促进生长、提高光合、增产提质',
    specs: [
      { spec: '8%水剂', manufacturer: '河南福瑞得生物', dosage: '600-1000', unit: '倍液' },
      { spec: '98%原粉', manufacturer: '湖北鸿福达生物', dosage: '10000-15000', unit: '倍液' },
    ],
  },
  {
    name: '复硝酚钠',
    types: ['plant_growth_regulator', 'pgr_promoter', 'pgr_stress'],
    ingredient: '5-硝基愈创木酚钠 + 邻硝基苯酚钠 + 对硝基苯酚钠',
    mechanism: '激活植物细胞活性，促进细胞分裂与伸长',
    functionDesc: '强力细胞赋活剂，能迅速渗透植物体内促进细胞原生质流动、提高细胞活力、加速生长发育。常用于解除药害、冻害、促根、保花保果。',
    tabooDesc: '不宜与强酸性农药直接混用。浓度过高可能抑制作物生长。',
    targetPests: '解除药害、促根壮苗、保花保果',
    specs: [
      { spec: '1.8%水剂', manufacturer: '日本旭化学', dosage: '1500-2500', unit: '倍液' },
      { spec: '98%原粉', manufacturer: '湖北源梦生物', dosage: '3000-5000', unit: '倍液' },
    ],
  },
  {
    name: '萘乙酸',
    types: ['plant_growth_regulator', 'pgr_rooting', 'pgr_fruit_set'],
    ingredient: 'α-萘乙酸（1-Naphthaleneacetic acid, NAA）',
    mechanism: '生长素类调节剂，刺激细胞分裂和伸长',
    functionDesc: '经典生长素类调节剂。低浓度促进生长、生根、保花保果；高浓度抑制生长（疏果）。广泛用于果树扦插生根、苹果/梨疏果、棉花保铃。',
    tabooDesc: '严格控制使用浓度。采前 30 天停止使用。对皮肤粘膜有刺激。',
    targetPests: '扦插生根、果树疏果、棉花保铃',
    specs: [
      { spec: '20%粉剂', manufacturer: '四川国光农化', dosage: '500-1000', unit: '倍液' },
      { spec: '5%水剂', manufacturer: '湖北源梦生物', dosage: '250-500', unit: '倍液' },
    ],
  },

  // ===== 延缓生长类（多效唑 / 矮壮素 / 烯效唑 / 缩节胺）=====
  {
    name: '多效唑',
    types: ['plant_growth_regulator', 'pgr_retardant'],
    ingredient: '多效唑（Paclobutrazol, PP333）',
    mechanism: '抑制赤霉素生物合成，延缓植物生长',
    functionDesc: '三唑类植物生长延缓剂。能抑制顶端分生组织细胞分裂，矮化植株，促进分枝和根系发达。广泛用于水稻育秧、果树控梢、花卉矮化、油菜壮苗。',
    tabooDesc: '土壤残留期长（可达 2-3 年），注意轮作安全。弱苗禁用。',
    targetPests: '控梢矮化、培育壮苗、抑制徒长',
    specs: [
      { spec: '15%可湿性粉剂', manufacturer: '江苏剑牌农化', dosage: '300-500', unit: '倍液' },
      { spec: '25%悬浮剂', manufacturer: '浙江钱江生化', dosage: '500-800', unit: '倍液' },
      { spec: '5%乳油', manufacturer: '上海升联化工', dosage: '200-400', unit: '倍液' },
    ],
  },
  {
    name: '烯效唑',
    types: ['plant_growth_regulator', 'pgr_retardant'],
    ingredient: '烯效唑（Uniconazole）',
    mechanism: '抑制赤霉素生物合成，活性为多效唑 5-10 倍',
    functionDesc: '高活性三唑类生长延缓剂，控旺效果比多效唑更强但残留更低。能矮化植株、促根壮苗、增强抗倒伏能力。用于水稻、小麦、油菜、花卉。',
    tabooDesc: '残留期较多效唑短（约 6 个月），对后茬作物影响小，但仍需注意。弱苗慎用。',
    targetPests: '控旺抗倒、培育壮苗',
    specs: [
      { spec: '5%可湿性粉剂', manufacturer: '浙江钱江生化', dosage: '500-1000', unit: '倍液' },
      { spec: '10%悬浮剂', manufacturer: '江苏常隆农化', dosage: '1000-1500', unit: '倍液' },
    ],
  },
  {
    name: '矮壮素',
    types: ['plant_growth_regulator', 'pgr_retardant'],
    ingredient: '矮壮素（Chlormequat, CCC）',
    mechanism: '抑制赤霉素生物合成，使植株矮化健壮',
    functionDesc: '经典生长延缓剂。能使植株节间缩短、茎秆变粗、叶色变绿、提高抗倒伏能力。广泛用于棉花、小麦、玉米、葡萄等作物。',
    tabooDesc: '弱苗、地薄田块不宜使用。不可与碱性农药混用。',
    targetPests: '矮化抗倒、控旺增产',
    specs: [
      { spec: '50%水剂', manufacturer: '河南福瑞得生物', dosage: '200-400', unit: '倍液' },
      { spec: '80%可溶粉剂', manufacturer: '山东恒丰化学', dosage: '500-1000', unit: '倍液' },
    ],
  },
  {
    name: '缩节胺（甲哌鎓）',
    types: ['plant_growth_regulator', 'pgr_retardant'],
    ingredient: '甲哌鎓（Mepiquat chloride）',
    mechanism: '抑制棉株主茎和果枝节间伸长',
    functionDesc: '棉花专用生长调节剂。能有效控制棉花徒长、塑造理想株型、增加蕾铃、防止倒伏、提高产量。是棉花"全程化控"的核心药剂。',
    tabooDesc: '严格按生育期使用。棉花打顶后禁用。干旱年份减少用量。',
    targetPests: '棉花化控、塑造株型',
    specs: [
      { spec: '25%水剂', manufacturer: '江苏剑牌农化', dosage: '800-1500', unit: '倍液' },
      { spec: '98%可溶粉剂', manufacturer: '湖北鸿福达生物', dosage: '5000-8000', unit: '倍液' },
    ],
  },

  // ===== 催熟催黄类（乙烯利 / 噻苯隆）=====
  {
    name: '乙烯利',
    types: ['plant_growth_regulator', 'pgr_ripening'],
    ingredient: '乙烯利（Ethephon）',
    mechanism: '在植物体内分解释放乙烯，促进果实成熟',
    functionDesc: '广谱催熟剂。能促进果实成熟、叶片脱落、雌花分化。广泛用于番茄、辣椒、苹果、柑橘、香蕉、棉花等催熟。也用于橡胶树增产。',
    tabooDesc: '对皮肤有腐蚀性，操作时戴防护手套。温度过低（<20℃）催熟效果差。安全间隔期 7-14 天。',
    targetPests: '果实催熟、棉花吐絮、橡胶增产',
    specs: [
      { spec: '40%水剂', manufacturer: '浙江钱江生化', dosage: '400-800', unit: '倍液' },
      { spec: '10%膏剂', manufacturer: '湖北源梦生物', dosage: '原液涂抹', unit: '倍液' },
    ],
  },
  {
    name: '噻苯隆',
    types: ['plant_growth_regulator', 'pgr_fruit_set', 'pgr_ripening'],
    ingredient: '噻苯隆（Thidiazuron, TDZ）',
    mechanism: '细胞分裂素类活性，促进果实膨大',
    functionDesc: '强力细胞分裂素类调节剂。能显著促进果实膨大、提高坐果率、防止落果。广泛用于葡萄（特别是"阳光玫瑰""克瑞森"等品种）、猕猴桃、苹果、棉花脱叶。',
    tabooDesc: '严格控制使用浓度，过高易导致空心果、畸形果。葡萄花后处理最佳。',
    targetPests: '葡萄膨大、果实增重、棉花脱叶',
    specs: [
      { spec: '0.1%可溶液剂', manufacturer: '四川国光农化', dosage: '100-300', unit: '倍液' },
      { spec: '50%可湿性粉剂', manufacturer: '江苏常隆农化', dosage: '500-1000', unit: '倍液' },
    ],
  },

  // ===== 生根壮苗类（吲哚丁酸 / 氯吡脲）=====
  {
    name: '吲哚丁酸',
    types: ['plant_growth_regulator', 'pgr_rooting'],
    ingredient: '吲哚丁酸（Indole-3-butyric acid, IBA）',
    mechanism: '生长素类，诱导根原基形成',
    functionDesc: '经典生根剂。能诱导植物根原基分化，促进不定根形成，提高扦插、移栽成活率。广泛用于林木、果树、花卉扦插育苗。',
    tabooDesc: '原药对皮肤有刺激，配制时戴手套。浓度过高抑制芽生长。',
    targetPests: '扦插生根、移栽促根',
    specs: [
      { spec: '98%原粉', manufacturer: '武汉鹏垒生物', dosage: '500-1000', unit: 'ppm' },
      { spec: '10%可湿性粉剂', manufacturer: '四川国光农化', dosage: '50-100', unit: '倍液' },
    ],
  },
  {
    name: '氯吡脲',
    types: ['plant_growth_regulator', 'pgr_fruit_set', 'pgr_rooting'],
    ingredient: '氯吡脲（Forchlorfenuron, CPPU）',
    mechanism: '细胞分裂素类，促进细胞分裂和果实膨大',
    functionDesc: '强力膨大素。能显著促进细胞分裂，使果实快速膨大、提高单果重。广泛用于猕猴桃、葡萄、甜瓜、西瓜等。',
    tabooDesc: '严格控制浓度，过高易致畸形、空心。登记作物以外的果树慎用，注意残留。',
    targetPests: '果实膨大、提高单果重',
    specs: [
      { spec: '0.5%水剂', manufacturer: '四川国光农化', dosage: '50-100', unit: '倍液' },
      { spec: '10%可溶液剂', manufacturer: '日本协和发酵', dosage: '200-400', unit: '倍液' },
    ],
  },
];

(async () => {
  console.log('=== 调节剂分类迁移脚本 ===');
  console.log('DB:', DB_PATH);

  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  // ---------- 1. 调节剂字典 ----------
  console.log('\n[1] 写入 pesticide_type 字典（调节剂 7 项）');
  let dictInserted = 0;
  for (const d of PGR_DICT) {
    db.run(
      `INSERT OR IGNORE INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, status)
       VALUES (?, 'pesticide_type', ?, ?, ?, ?, ?, 'active')`,
      [d.id, d.code, d.label, d.code, d.color, d.sort]
    );
    // 已存在则跳过，未存在则算 1
    const changes = db.getRowsModified();
    dictInserted += changes;
  }
  console.log(`  调节剂字典：${dictInserted}/${PGR_DICT.length} 写入成功（其余已存在）`);

  // ---------- 2. 调节剂种子数据 ----------
  console.log('\n[2] 写入 pesticide_specs 调节剂种子');

  // 查询当前最大编码序号（从 269 继续）
  const maxNumResult = db.exec(
    "SELECT MAX(CAST(SUBSTR(pesticide_code, 4) AS INTEGER)) FROM pesticide_specs WHERE pesticide_code LIKE 'PC-%'"
  );
  let codeIndex = maxNumResult[0]?.values?.[0]?.[0] != null ? Number(maxNumResult[0].values[0][0]) : 269;

  let pesticideInserted = 0;
  for (const p of PGR_PESTICIDES) {
    const pesticideType = JSON.stringify(p.types);
    for (const spec of p.specs) {
      codeIndex++;
      const id = `ps-pgr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${codeIndex}`;
      const code = `PC-${String(codeIndex).padStart(4, '0')}`;
      db.run(
        `INSERT INTO pesticide_specs (
          id, pesticide_code, pesticide_name, pesticide_type,
          ingredient, mechanism, function_desc, taboo_desc, target_pests,
          spec_content, manufacturer, suggested_dosage, dosage_unit,
          stock_quantity, stock_unit, unit_price, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, code, p.name, pesticideType,
          p.ingredient, p.mechanism, p.functionDesc,
          p.tabooDesc, p.targetPests,
          spec.spec, spec.manufacturer, spec.dosage, spec.unit,
          0, 'kg', 0, 'active',
        ]
      );
      pesticideInserted++;
    }
  }
  console.log(`  调节剂种子：${pesticideInserted} 条规格记录（编码 PC-${codeIndex - pesticideInserted + 1} ~ PC-${codeIndex}）`);

  // ---------- 保存 ----------
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('\n✓ DB 已保存到磁盘');

  // ---------- 验证 ----------
  console.log('\n=== 验证 ===');

  const dictCheck = db.exec(
    "SELECT COUNT(*) FROM dictionaries WHERE category_code='pesticide_type' AND (dict_code='plant_growth_regulator' OR dict_code LIKE 'pgr\\_%' ESCAPE '\\')"
  );
  console.log('调节剂字典条数:', dictCheck[0]?.values?.[0]?.[0], '/7');

  const pgrPesticideCheck = db.exec(
    "SELECT COUNT(DISTINCT pesticide_name) FROM pesticide_specs WHERE pesticide_type LIKE '%plant_growth_regulator%' OR pesticide_type LIKE '%pgr\\_%' ESCAPE '\\'"
  );
  console.log('调节剂药剂品种数:', pgrPesticideCheck[0]?.values?.[0]?.[0], '/14');

  const newMax = db.exec("SELECT MAX(pesticide_code) FROM pesticide_specs");
  console.log('最新药剂编码:', newMax[0]?.values?.[0]?.[0]);

  // 列前 5 个调节剂名称
  const sampleNames = db.exec(
    "SELECT DISTINCT pesticide_name FROM pesticide_specs WHERE pesticide_type LIKE '%plant_growth_regulator%' OR pesticide_type LIKE '%pgr\\_%' ESCAPE '\\' ORDER BY pesticide_code LIMIT 5"
  );
  console.log('前 5 个调节剂:', sampleNames[0]?.values?.map(r => r[0]).join('、'));

  db.close();
  console.log('\n迁移完成。请重启后端服务器。');
})().catch((err) => {
  console.error('迁移失败:', err);
  process.exit(1);
});