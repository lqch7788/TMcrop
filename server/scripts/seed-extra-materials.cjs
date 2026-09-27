/**
 * 2026-09-27：批量补充测试物料（用户要求：为全面测试各种物料）
 * 按物料编码规则生成：大类2位 + 中类2位 + 小类2位 + 序号3位
 * 分类来源：material_code_categories (rule_type=material)
 * 通过 /api/materials/inbound 入库（同时写 materials 主表 + batch_inventory 批次表）
 *
 * 运行：node server/scripts/seed-extra-materials.cjs
 */
const BASE = 'http://localhost:3001/api';
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };

const SUPPLIERS = {
  seed: '绿丰种业有限公司', fert: '金土地农资公司', pest: '农安植保科技',
  equip: '宏达农业设施', labor: '安泰劳保用品', pack: '恒信包装材料',
  iot: '慧农物联网科技', energy: '中石化农用油站',
};

const GROUPS = [
  { big: 'SP', inbound: 'RK20260927-SP', supplier: SUPPLIERS.fert, items: [
    { code: 'SP0102001', name: '玉米种子（郑单958）', category: '生产投入类-种质资源-经济作物种子', spec: '5kg/袋', unit: '袋', qty: 80, price: 45, min: 20, max: 200, loc: 'D区-01-01', batch: 'SEED-CORN-2601', prod: '2026-03-01', exp: '2027-03-01' },
    { code: 'SP0103002', name: '番茄种子（金棚1号）', category: '生产投入类-种质资源-蔬菜种子', spec: '10g/袋', unit: '袋', qty: 120, price: 68, min: 30, max: 300, loc: 'D区-01-02', batch: 'SEED-TOM-2601', prod: '2026-02-15', exp: '2027-02-15' },
    { code: 'SP0103003', name: '黄瓜种子（津优35）', category: '生产投入类-种质资源-蔬菜种子', spec: '20g/袋', unit: '袋', qty: 100, price: 55, min: 25, max: 250, loc: 'D区-01-03', batch: 'SEED-CUC-2601', prod: '2026-02-20', exp: '2027-02-20' },
    { code: 'SP0103004', name: '辣椒种子（螺丝椒）', category: '生产投入类-种质资源-蔬菜种子', spec: '15g/袋', unit: '袋', qty: 90, price: 72, min: 20, max: 200, loc: 'D区-01-04', batch: 'SEED-PEP-2601', prod: '2026-03-05', exp: '2027-03-05' },
    { code: 'SP0104001', name: '番茄种苗（穴盘苗）', category: '生产投入类-种质资源-蔬菜种苗', spec: '72穴/盘', unit: '株', qty: 2000, price: 0.8, min: 200, max: 5000, loc: '育苗温室A区', batch: 'SEEDLING-TOM-2609', prod: '2026-09-01', exp: '2026-10-15' },
    { code: 'SP0105001', name: '草莓苗（红颜）', category: '生产投入类-种质资源-水果苗木种苗', spec: '裸根苗', unit: '株', qty: 1500, price: 1.2, min: 200, max: 4000, loc: '育苗温室B区', batch: 'SEEDLING-STR-2609', prod: '2026-09-05', exp: '2026-10-20' },
    { code: 'SP0201002', name: '生物有机肥', category: '生产投入类-肥料与土壤改良剂-有机肥', spec: '40kg/袋', unit: '袋', qty: 200, price: 85, min: 50, max: 500, loc: 'A区-01-03', batch: 'FERT-ORG-2608', prod: '2026-08-01', exp: '2028-08-01' },
    { code: 'SP0202001', name: '尿素（46%氮）', category: '生产投入类-肥料与土壤改良剂-化学肥料', spec: '50kg/袋', unit: '袋', qty: 150, price: 120, min: 40, max: 400, loc: 'A区-02-01', batch: 'FERT-UREA-2608', prod: '2026-08-10', exp: '2029-08-10' },
    { code: 'SP0202002', name: '磷酸二铵（64%）', category: '生产投入类-肥料与土壤改良剂-化学肥料', spec: '50kg/袋', unit: '袋', qty: 100, price: 180, min: 30, max: 300, loc: 'A区-02-02', batch: 'FERT-DAP-2608', prod: '2026-08-12', exp: '2029-08-12' },
    { code: 'SP0202003', name: '硫酸钾（50%钾）', category: '生产投入类-肥料与土壤改良剂-化学肥料', spec: '50kg/袋', unit: '袋', qty: 80, price: 210, min: 20, max: 250, loc: 'A区-02-03', batch: 'FERT-K2SO4-2608', prod: '2026-08-15', exp: '2029-08-15' },
    { code: 'SP0203001', name: '大量元素水溶肥（20-20-20）', category: '生产投入类-肥料与土壤改良剂-水溶肥', spec: '20kg/袋', unit: '袋', qty: 60, price: 320, min: 15, max: 150, loc: 'A区-03-01', batch: 'FERT-WS-2609', prod: '2026-09-01', exp: '2028-09-01' },
    { code: 'SP0203002', name: '高钾水溶肥（13-6-40）', category: '生产投入类-肥料与土壤改良剂-水溶肥', spec: '20kg/袋', unit: '袋', qty: 50, price: 360, min: 15, max: 150, loc: 'A区-03-02', batch: 'FERT-WSK-2609', prod: '2026-09-01', exp: '2028-09-01' },
    { code: 'SP0204001', name: '磷酸二氢钾（叶面肥）', category: '生产投入类-肥料与土壤改良剂-叶面肥', spec: '1kg/袋', unit: '袋', qty: 100, price: 28, min: 20, max: 200, loc: 'A区-04-01', batch: 'FERT-MKP-2607', prod: '2026-07-01', exp: '2028-07-01' },
    { code: 'SP0205001', name: '枯草芽孢杆菌菌剂', category: '生产投入类-肥料与土壤改良剂-微生物菌剂', spec: '1kg/袋', unit: '袋', qty: 40, price: 65, min: 10, max: 100, loc: 'A区-05-01', batch: 'BIO-BS-2608', prod: '2026-08-01', exp: '2027-08-01' },
    { code: 'SP0207001', name: '育苗基质（草炭型）', category: '生产投入类-肥料与土壤改良剂-育苗基质', spec: '50L/袋', unit: '袋', qty: 120, price: 35, min: 30, max: 300, loc: 'A区-07-01', batch: 'SUB-2609', prod: '2026-09-01', exp: '2028-09-01' },
    { code: 'SP0301002', name: '啶虫脒（20%可溶粉）', category: '生产投入类-农药与植保产品-杀虫剂', spec: '100g/袋', unit: '袋', qty: 80, price: 22, min: 20, max: 200, loc: 'B区-01-01', batch: 'PEST-ACE-2607', prod: '2026-07-01', exp: '2028-07-01' },
    { code: 'SP0301003', name: '阿维菌素（1.8%乳油）', category: '生产投入类-农药与植保产品-杀虫剂', spec: '200ml/瓶', unit: '瓶', qty: 60, price: 35, min: 15, max: 150, loc: 'B区-01-02', batch: 'PEST-ABM-2607', prod: '2026-07-05', exp: '2028-07-05' },
    { code: 'SP0302002', name: '代森锰锌（80%可湿粉）', category: '生产投入类-农药与植保产品-杀菌剂', spec: '500g/袋', unit: '袋', qty: 90, price: 18, min: 20, max: 200, loc: 'B区-02-01', batch: 'PEST-MAN-2606', prod: '2026-06-01', exp: '2028-06-01' },
    { code: 'SP0302003', name: '嘧菌酯（25%悬浮剂）', category: '生产投入类-农药与植保产品-杀菌剂', spec: '250ml/瓶', unit: '瓶', qty: 50, price: 85, min: 15, max: 120, loc: 'B区-02-02', batch: 'PEST-AZO-2606', prod: '2026-06-10', exp: '2028-06-10' },
    { code: 'SP0304001', name: '草铵膦（200g/L水剂）', category: '生产投入类-农药与植保产品-除草剂', spec: '1L/瓶', unit: '瓶', qty: 40, price: 45, min: 10, max: 100, loc: 'B区-04-01', batch: 'PEST-GLU-2605', prod: '2026-05-01', exp: '2028-05-01' },
    { code: 'SP0306001', name: '黄板（粘虫板）', category: '生产投入类-农药与植保产品-物理防控用品', spec: '25×20cm', unit: '张', qty: 500, price: 1.5, min: 100, max: 1000, loc: 'B区-06-01', batch: 'PHY-YB-2609', prod: '2026-09-01', exp: '' },
    { code: 'SP0307001', name: '苏云金杆菌（Bt）', category: '生产投入类-农药与植保产品-生物农药', spec: '500g/袋', unit: '袋', qty: 30, price: 55, min: 10, max: 80, loc: 'B区-07-01', batch: 'BIO-BT-2608', prod: '2026-08-01', exp: '2027-08-01' },
  ]},
  { big: 'EQ', inbound: 'RK20260927-EQ', supplier: SUPPLIERS.equip, items: [
    { code: 'EQ0102001', name: '滴灌管（16mm）', category: '设施与装备类-生产设施-灌溉设备', spec: '16mm×0.4mm', unit: '米', qty: 2000, price: 1.8, min: 300, max: 5000, loc: 'C区-01-01', batch: 'EQ-DRIP-2603', prod: '2026-03-01', exp: '2031-03-01' },
    { code: 'EQ0102002', name: '微喷头（倒挂式）', category: '设施与装备类-生产设施-灌溉设备', spec: '倒挂式', unit: '个', qty: 500, price: 3.5, min: 100, max: 1000, loc: 'C区-01-02', batch: 'EQ-SPR-2603', prod: '2026-03-01', exp: '2031-03-01' },
    { code: 'EQ0104001', name: '保温被（大棚用）', category: '设施与装备类-生产设施-保温设备', spec: '3m×20m', unit: '卷', qty: 20, price: 480, min: 5, max: 50, loc: 'C区-04-01', batch: 'EQ-WARM-2509', prod: '2025-09-01', exp: '' },
    { code: 'EQ0105001', name: '湿帘（降温用）', category: '设施与装备类-生产设施-降温设备', spec: '1.5m×0.6m', unit: '块', qty: 30, price: 260, min: 8, max: 60, loc: 'C区-05-01', batch: 'EQ-PAD-2604', prod: '2026-04-01', exp: '' },
    { code: 'EQ0202002', name: '手推式播种机', category: '设施与装备类-农机具-播种机械', spec: '4行', unit: '台', qty: 5, price: 680, min: 2, max: 10, loc: 'C区-12-01', batch: 'EQ-SEED-2602', prod: '2026-02-01', exp: '' },
    { code: 'EQ0302001', name: '半自动封箱机', category: '设施与装备类-包装设备-包装机械', spec: '50mm胶带', unit: '台', qty: 3, price: 1500, min: 1, max: 5, loc: 'C区-22-01', batch: 'EQ-SEAL-2601', prod: '2026-01-15', exp: '' },
  ]},
  { big: 'OP', inbound: 'RK20260927-OP', supplier: SUPPLIERS.labor, items: [
    { code: 'OP0101001', name: '丁腈手套', category: '作业支持类-劳保与防护用品-手部防护', spec: 'L码', unit: '副', qty: 300, price: 2.5, min: 100, max: 800, loc: 'E区-01-01', batch: 'OP-GLV-2608', prod: '2026-08-01', exp: '2029-08-01' },
    { code: 'OP0101002', name: '棉纱手套', category: '作业支持类-劳保与防护用品-手部防护', spec: '均码', unit: '副', qty: 400, price: 1.2, min: 100, max: 1000, loc: 'E区-01-02', batch: 'OP-GLV2-2608', prod: '2026-08-01', exp: '' },
    { code: 'OP0104001', name: '防护口罩（KN95）', category: '作业支持类-劳保与防护用品-呼吸/眼部防护', spec: 'KN95', unit: '个', qty: 200, price: 3, min: 50, max: 500, loc: 'E区-04-01', batch: 'OP-MASK-2608', prod: '2026-08-01', exp: '2028-08-01' },
    { code: 'OP0201002', name: '铁锹（尖头）', category: '作业支持类-日常劳动工具-手动农具', spec: '尖头', unit: '把', qty: 30, price: 45, min: 10, max: 60, loc: 'E区-11-01', batch: 'OP-SHOVEL-2601', prod: '2026-01-15', exp: '2031-01-15' },
    { code: 'OP0202001', name: '果树剪（8寸）', category: '作业支持类-日常劳动工具-修剪工具', spec: '8寸', unit: '把', qty: 25, price: 65, min: 8, max: 50, loc: 'E区-12-01', batch: 'OP-PRUNE-2602', prod: '2026-02-01', exp: '2029-02-01' },
    { code: 'OP0203002', name: '割草机（背负式）', category: '作业支持类-日常劳动工具-小型电动工具', spec: '背负式', unit: '台', qty: 8, price: 850, min: 2, max: 15, loc: 'E区-13-01', batch: 'OP-MOW-2603', prod: '2026-03-01', exp: '' },
    { code: 'OP0301001', name: '田间标牌', category: '作业支持类-标识与记录用品-田间标牌/标签', spec: '15×20cm', unit: '个', qty: 200, price: 4, min: 50, max: 500, loc: 'E区-21-01', batch: 'OP-SIGN-2609', prod: '2026-09-01', exp: '' },
  ]},
  { big: 'PH', inbound: 'RK20260927-PH', supplier: SUPPLIERS.pack, items: [
    { code: 'PH0101001', name: '塑料周转箱', category: '采后处理与流通类-采收容器-塑料周转箱', spec: '600×400×230mm', unit: '个', qty: 150, price: 38, min: 30, max: 300, loc: 'F区-01-01', batch: 'PH-BOX-2606', prod: '2026-06-01', exp: '' },
    { code: 'PH0102001', name: '采摘篮', category: '采后处理与流通类-采收容器-采摘篮/筐', spec: '10kg', unit: '个', qty: 100, price: 22, min: 20, max: 200, loc: 'F区-02-01', batch: 'PH-BASKET-2606', prod: '2026-06-01', exp: '' },
    { code: 'PH0104002', name: '编织袋（50kg）', category: '采后处理与流通类-采收容器-吨袋/编织袋', spec: '50kg', unit: '条', qty: 500, price: 1, min: 100, max: 1000, loc: 'F区-04-02', batch: 'PH-BAG-2607', prod: '2026-07-01', exp: '' },
    { code: 'PH0106001', name: '泡沫网套', category: '采后处理与流通类-采收容器-泡沫网套/隔板', spec: '通用', unit: '个', qty: 2000, price: 0.15, min: 500, max: 5000, loc: 'F区-06-01', batch: 'PH-FOAM-2608', prod: '2026-08-01', exp: '' },
    { code: 'PH0107001', name: '封箱胶带', category: '采后处理与流通类-采收容器-胶带、封口耗材', spec: '60mm×100m', unit: '卷', qty: 100, price: 6.5, min: 30, max: 300, loc: 'F区-07-01', batch: 'PH-TAPE-2608', prod: '2026-08-01', exp: '' },
    { code: 'PH0203002', name: '冰袋（蓄冷）', category: '采后处理与流通类-冷链与仓储设备-保温箱、冰袋', spec: '200g', unit: '个', qty: 300, price: 1.8, min: 100, max: 800, loc: 'F区-13-01', batch: 'PH-ICE-2609', prod: '2026-09-01', exp: '2027-09-01' },
  ]},
  { big: 'IT', inbound: 'RK20260927-IT', supplier: SUPPLIERS.iot, items: [
    { code: 'IT0101002', name: '空气温湿度传感器', category: '数字化与管理类-监测设备-空气/土壤/光照等传感器', spec: 'RS485输出', unit: '个', qty: 40, price: 180, min: 10, max: 80, loc: 'G区-01-01', batch: 'IT-TH-2605', prod: '2026-05-01', exp: '2031-05-01' },
    { code: 'IT0102001', name: '手持式EC计', category: '数字化与管理类-监测设备-手持检测类设备', spec: '便携式', unit: '台', qty: 10, price: 320, min: 3, max: 25, loc: 'G区-02-01', batch: 'IT-EC-2604', prod: '2026-04-01', exp: '2031-04-01' },
    { code: 'IT0103001', name: '小型气象站（6要素）', category: '数字化与管理类-监测设备-气象站', spec: '6要素', unit: '台', qty: 5, price: 3800, min: 1, max: 10, loc: 'G区-03-01', batch: 'IT-WS-2603', prod: '2026-03-01', exp: '2031-03-01' },
    { code: 'IT0202001', name: '电磁阀控制器（8路）', category: '数字化与管理类-控制设备-执行控制设备', spec: '8路输出', unit: '个', qty: 25, price: 420, min: 8, max: 50, loc: 'G区-12-01', batch: 'IT-VALVE-2605', prod: '2026-05-01', exp: '2031-05-01' },
    { code: 'IT0202002', name: '卷膜电机（1.5kW）', category: '数字化与管理类-控制设备-执行控制设备', spec: '1.5kW', unit: '台', qty: 12, price: 780, min: 4, max: 30, loc: 'G区-12-02', batch: 'IT-MOTOR-2605', prod: '2026-05-01', exp: '2031-05-01' },
    { code: 'IT0204001', name: '4G网关', category: '数字化与管理类-控制设备-通信与联网设备', spec: '全网通', unit: '台', qty: 15, price: 560, min: 5, max: 40, loc: 'G区-14-01', batch: 'IT-GW-2606', prod: '2026-06-01', exp: '2031-06-01' },
  ]},
  { big: 'EC', inbound: 'RK20260927-EC', supplier: SUPPLIERS.energy, items: [
    { code: 'EC0101001', name: '柴油（0号）', category: '能源与通用耗材-能源类-柴油/汽油', spec: '0号', unit: '升', qty: 1000, price: 7.2, min: 200, max: 2000, loc: 'H区-油罐', batch: 'EC-DSL-2609', prod: '2026-09-01', exp: '2027-09-01' },
    { code: 'EC0103001', name: '太阳能板（300W）', category: '能源与通用耗材-能源类-太阳能板及配件', spec: '300W', unit: '块', qty: 20, price: 680, min: 5, max: 50, loc: 'H区-02-01', batch: 'EC-SOLAR-2604', prod: '2026-04-01', exp: '2033-04-01' },
    { code: 'EC0201001', name: '电缆线（3×2.5平方）', category: '能源与通用耗材-通用耗材-电线、电缆', spec: '3×2.5mm', unit: '米', qty: 800, price: 8.5, min: 200, max: 1500, loc: 'H区-11-01', batch: 'EC-CABLE-2605', prod: '2026-05-01', exp: '' },
    { code: 'EC0202001', name: '尼龙扎带（30cm）', category: '能源与通用耗材-通用耗材-扎带、螺丝、密封胶', spec: '30cm/100根', unit: '包', qty: 100, price: 12, min: 30, max: 200, loc: 'H区-12-01', batch: 'EC-TIE-2607', prod: '2026-07-01', exp: '' },
    { code: 'EC0203001', name: '碱性电池（5号）', category: '能源与通用耗材-通用耗材-电池', spec: '5号碱性', unit: '节', qty: 500, price: 2.5, min: 100, max: 1000, loc: 'H区-13-01', batch: 'EC-BAT-2606', prod: '2026-06-01', exp: '2029-06-01' },
    { code: 'EC0204001', name: '机油（4L）', category: '能源与通用耗材-通用耗材-润滑油、润滑脂', spec: '4L/桶', unit: '桶', qty: 30, price: 95, min: 8, max: 80, loc: 'H区-14-01', batch: 'EC-OIL-2608', prod: '2026-08-01', exp: '2029-08-01' },
  ]},
];

(async () => {
  let total = 0, ok = 0;
  for (const g of GROUPS) {
    const materials = g.items.map((it) => ({
      code: it.code, name: it.name, category: it.category, specification: it.spec, unit: it.unit,
      quantity: it.qty, minStock: it.min, maxStock: it.max, price: String(it.price),
      supplier: g.supplier, location: it.loc, barcode: '', batchNo: it.batch,
      productionDate: it.prod, expiryDate: it.exp, dataStatus: '启用',
    }));
    const r = await j(await fetch(`${BASE}/materials/inbound`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: g.inbound, inboundDate: '2026-09-27', supplier: g.supplier, operator: '系统初始化', status: 'completed', materials }),
    }));
    total += materials.length;
    if (r.success !== false && !r.error) { ok += materials.length; console.log(`OK ${g.big} 组入库 ${materials.length} 个物料`); }
    else console.log(`FAIL ${g.big} 组:`, JSON.stringify(r).slice(0, 200));
  }
  console.log(`\n合计: ${ok}/${total} 成功`);
})();
