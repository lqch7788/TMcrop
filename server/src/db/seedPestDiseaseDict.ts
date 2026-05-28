/**
 * 病虫害字典种子数据
 * 用于初始化常见病虫害数据
 */

import { getDatabase, saveDatabase } from './index';

interface PestDiseaseSeed {
  id: string;
  dictCode: string;
  dictName: string;
  dictType: 'pest' | 'disease';
  targetCrops?: string;
  description?: string;
}

// 虫害数据
const defaultPests: PestDiseaseSeed[] = [
  // 番茄常见虫害
  { id: 'PD-P-0001', dictCode: 'PD-P-0001', dictName: '白粉虱', dictType: 'pest', targetCrops: '番茄,黄瓜,茄子', description: '成虫和若虫吸取植物汁液，导致叶片褪绿、萎缩，并分泌蜜露诱发煤污病' },
  { id: 'PD-P-0002', dictCode: 'PD-P-0002', dictName: '蚜虫', dictType: 'pest', targetCrops: '番茄,黄瓜,辣椒,茄子', description: '吸取植物汁液，传播病毒病，分泌蜜露诱发煤污病' },
  { id: 'PD-P-0003', dictCode: 'PD-P-0003', dictName: '红蜘蛛', dictType: 'pest', targetCrops: '番茄,黄瓜,茄子,辣椒', description: '叶螨科，在叶背吸食汁液，叶片出现黄白色小点，严重时干枯脱落' },
  { id: 'PD-P-0004', dictCode: 'PD-P-0004', dictName: '棉铃虫', dictType: 'pest', targetCrops: '番茄,玉米', description: '幼虫蛀食果实，造成落果、烂果，严重影响产量和品质' },
  { id: 'PD-P-0005', dictCode: 'PD-P-0005', dictName: '烟青虫', dictType: 'pest', targetCrops: '番茄,辣椒,烟草', description: '幼虫蛀食嫩叶和果实，造成孔洞和腐烂' },
  { id: 'PD-P-0006', dictCode: 'PD-P-0006', dictName: '斑潜蝇', dictType: 'pest', targetCrops: '番茄,黄瓜,茄子,叶菜类', description: '幼虫在叶片内取食形成隧道，影响光合作用，严重时叶片干枯' },
  { id: 'PD-P-0007', dictCode: 'PD-P-0007', dictName: '蓟马', dictType: 'pest', targetCrops: '番茄,辣椒,茄子,瓜类', description: '成虫和若虫锉吸植物幼嫩部分，导致叶片畸形、生长点受损' },
  { id: 'PD-P-0008', dictCode: 'PD-P-0008', dictName: '地老虎', dictType: 'pest', targetCrops: '番茄,辣椒,茄子,瓜类', description: '夜间取食幼苗根茎部，造成缺苗断垄' },
  { id: 'PD-P-0009', dictCode: 'PD-P-0009', dictName: '蛴螬', dictType: 'pest', targetCrops: '番茄,马铃薯,萝卜,胡萝卜', description: '金龟子幼虫，在地下咬断根系和地下茎，导致植株萎蔫死亡' },
  { id: 'PD-P-0010', dictCode: 'PD-P-0010', dictName: '小菜蛾', dictType: 'pest', targetCrops: '甘蓝,白菜,萝卜,芥菜', description: '幼虫取食叶片，造成孔洞和缺刻，严重时只留叶脉' },
  { id: 'PD-P-0011', dictCode: 'PD-P-0011', dictName: '菜青虫', dictType: 'pest', targetCrops: '甘蓝,白菜,花椰菜', description: '菜粉蝶幼虫，取食叶片，影响作物生长和品质' },
  { id: 'PD-P-0012', dictCode: 'PD-P-0012', dictName: '甜菜夜蛾', dictType: 'pest', targetCrops: '甘蓝,白菜,番茄,玉米', description: '幼虫取食叶片和果实，具有暴食性，严重时吃光叶片' },
  { id: 'PD-P-0013', dictCode: 'PD-P-0013', dictName: '斜纹夜蛾', dictType: 'pest', targetCrops: '甘蓝,白菜,番茄,红薯', description: '杂食性害虫，幼虫取食叶片、花和果实，爆发性强' },
  { id: 'PD-P-0014', dictCode: 'PD-P-0014', dictName: '黄守瓜', dictType: 'pest', targetCrops: '黄瓜,西瓜,甜瓜,南瓜', description: '成虫取食叶片和瓜花，幼虫危害根部，导致死苗' },
  { id: 'PD-P-0015', dictCode: 'PD-P-0015', dictName: '瓜绢螟', dictType: 'pest', targetCrops: '黄瓜,西瓜,甜瓜,丝瓜', description: '幼虫吐丝卷叶，在叶内取食，严重时只留叶脉' },
  { id: 'PD-P-0016', dictCode: 'PD-P-0016', dictName: '豆野螟', dictType: 'pest', targetCrops: '豇豆,菜豆,毛豆', description: '幼虫蛀食豆荚，造成落荚、虫荚，影响产量和品质' },
  { id: 'PD-P-0017', dictCode: 'PD-P-0017', dictName: '豌豆象', dictType: 'pest', targetCrops: '豌豆', description: '幼虫蛀食豆粒，造成减产和品质下降' },
  { id: 'PD-P-0018', dictCode: 'PD-P-0018', dictName: '萝卜蝇', dictType: 'pest', targetCrops: '萝卜,白菜,芥菜', description: '幼虫危害根部，造成根部腐烂，影响产量' },
  { id: 'PD-P-0019', dictCode: 'PD-P-0019', dictName: '葱蓟马', dictType: 'pest', targetCrops: '大葱,洋葱,大蒜,韭菜', description: '锉吸叶片，造成白色斑点，严重时叶片枯黄' },
  { id: 'PD-P-0020', dictCode: 'PD-P-0020', dictName: '葱斑潜蝇', dictType: 'pest', targetCrops: '大葱,洋葱,韭菜', description: '幼虫在叶片内形成隧道，影响光合作用' },
  { id: 'PD-P-0021', dictCode: 'PD-P-0021', dictName: '韭蛆', dictType: 'pest', targetCrops: '韭菜,大葱,大蒜', description: '幼虫聚集危害地下假茎和鳞茎，导致腐烂死亡' },
  { id: 'PD-P-0022', dictCode: 'PD-P-0022', dictName: '茶黄螨', dictType: 'pest', targetCrops: '茄子,辣椒,番茄,黄瓜', description: '成螨和若螨吸食幼嫩组织，导致叶片畸形、卷曲' },
  { id: 'PD-P-0023', dictCode: 'PD-P-0023', dictName: '朱砂叶螨', dictType: 'pest', targetCrops: '茄子,辣椒,番茄,豆类', description: '叶螨的一种，在叶背吸食汁液，叶片红褐色' },
  { id: 'PD-P-0024', dictCode: 'PD-P-0024', dictName: '二十八星瓢虫', dictType: 'pest', targetCrops: '茄子,番茄,黄瓜', description: '成虫和幼虫取食叶片，造成孔洞，严重时只留叶脉' },
  { id: 'PD-P-0025', dictCode: 'PD-P-0025', dictName: '根结线虫', dictType: 'pest', targetCrops: '番茄,黄瓜,茄子,辣椒,胡萝卜', description: '地下害虫，根部形成根结，影响水分和养分吸收' },
  { id: 'PD-P-0026', dictCode: 'PD-P-0026', dictName: '蜗牛', dictType: 'pest', targetCrops: '白菜,甘蓝,萝卜,豆类', description: '舔食叶片和果实，形成孔洞和咬痕，爬过留下粘液痕迹' },
  { id: 'PD-P-0027', dictCode: 'PD-P-0027', dictName: '蛞蝓', dictType: 'pest', targetCrops: '白菜,甘蓝,萝卜,豆类', description: '舔食幼嫩组织，形成孔洞和咬痕，夜间活动' },
  { id: 'PD-P-0028', dictCode: 'PD-P-0028', dictName: '鼠妇', dictType: 'pest', targetCrops: '温室蔬菜,草莓', description: '危害幼苗和地下部分，在潮湿环境中活动' },
  { id: 'PD-P-0029', dictCode: 'PD-P-0029', dictName: '跳甲', dictType: 'pest', targetCrops: '白菜,萝卜,芥菜,甘蓝', description: '成虫取食叶片，形成密集小孔，幼虫危害根部' },
  { id: 'PD-P-0030', dictCode: 'PD-P-0030', dictName: '稻飞虱', dictType: 'pest', targetCrops: '水稻', description: '吸食稻株汁液，导致黄叶、矮化，传播病毒病' },
];

// 病害数据
const defaultDiseases: PestDiseaseSeed[] = [
  // 番茄常见病害
  { id: 'PD-D-0001', dictCode: 'PD-D-0001', dictName: '早疫病', dictType: 'disease', targetCrops: '番茄,茄子,辣椒,马铃薯', description: '叶片出现同心轮纹斑，后期干枯脱落，果实出现病斑' },
  { id: 'PD-D-0002', dictCode: 'PD-D-0002', dictName: '晚疫病', dictType: 'disease', targetCrops: '番茄,茄子,辣椒,马铃薯', description: '叶片水浸状病斑，果实出现暗褐色病斑，高湿条件下产生白色霉层' },
  { id: 'PD-D-0003', dictCode: 'PD-D-0003', dictName: '灰霉病', dictType: 'disease', targetCrops: '番茄,黄瓜,茄子,草莓,菜豆', description: '叶片、果实发病，表面产生灰色霉层，引起腐烂' },
  { id: 'PD-D-0004', dictCode: 'PD-D-0004', dictName: '叶霉病', dictType: 'disease', targetCrops: '番茄,茄子,辣椒', description: '叶片正面出现黄绿色斑，背面产生紫灰色霉层' },
  { id: 'PD-D-0005', dictCode: 'PD-D-0005', dictName: '斑枯病', dictType: 'disease', targetCrops: '番茄,茄子', description: '叶片出现灰白色斑点，边缘褐色，后期病斑上产生小黑点' },
  { id: 'PD-D-0006', dictCode: 'PD-D-0006', dictName: '灰叶斑病', dictType: 'disease', targetCrops: '番茄', description: '叶片出现灰褐色小斑点，后期穿孔' },
  { id: 'PD-D-0007', dictCode: 'PD-D-0007', dictName: '青枯病', dictType: 'disease', targetCrops: '番茄,茄子,辣椒,萝卜', description: '细菌性萎蔫病，植株突然萎蔫死亡，维管束变褐色' },
  { id: 'PD-D-0008', dictCode: 'PD-D-0008', dictName: '枯萎病', dictType: 'disease', targetCrops: '番茄,黄瓜,西瓜,甜瓜', description: '真菌性萎蔫病，从下往上黄化枯萎，茎基部缢缩' },
  { id: 'PD-D-0009', dictCode: 'PD-D-0009', dictName: '黄萎病', dictType: 'disease', targetCrops: '番茄,茄子,辣椒,棉花', description: '叶片从边缘开始黄化，茎部维管束变褐色' },
  { id: 'PD-D-0010', dictCode: 'PD-D-0010', dictName: '茎基腐病', dictType: 'disease', targetCrops: '番茄,茄子,辣椒,黄瓜', description: '茎基部腐烂缢缩，表面产生白色棉絮状菌丝' },
  { id: 'PD-D-0011', dictCode: 'PD-D-0011', dictName: '根腐病', dictType: 'disease', targetCrops: '番茄,黄瓜,茄子,辣椒,草莓', description: '根部腐烂，植株生长不良，叶片黄化' },
  { id: 'PD-D-0012', dictCode: 'PD-D-0012', dictName: '病毒病', dictType: 'disease', targetCrops: '番茄,辣椒,茄子,黄瓜,南瓜', description: '叶片花叶、皱缩、畸形，植株矮化，影响产量和品质' },
  { id: 'PD-D-0013', dictCode: 'PD-D-0013', dictName: '溃疡病', dictType: 'disease', targetCrops: '番茄', description: '细菌性病害，茎部出现白色条斑，后期开裂，果实出现鸟眼斑' },
  { id: 'PD-D-0014', dictCode: 'PD-D-0014', dictName: '疮痂病', dictType: 'disease', targetCrops: '番茄,辣椒,茄子', description: '叶片出现黄色斑点，果实出现隆起的木栓化小斑点' },
  { id: 'PD-D-0015', dictCode: 'PD-D-0015', dictName: '软腐病', dictType: 'disease', targetCrops: '番茄,白菜,萝卜,甘蓝,胡萝卜', description: '细菌性软腐，产生恶臭，高温高湿条件下发病严重' },
  { id: 'PD-D-0016', dictCode: 'PD-D-0016', dictName: '菌核病', dictType: 'disease', targetCrops: '番茄,黄瓜,茄子,白菜,萝卜', description: '茎叶出现水浸状斑，后期产生黑色菌核' },
  { id: 'PD-D-0017', dictCode: 'PD-D-0017', dictName: '蔓枯病', dictType: 'disease', targetCrops: '黄瓜,西瓜,甜瓜,南瓜', description: '茎蔓出现椭圆形或长条形病斑，流胶，后期干枯' },
  { id: 'PD-D-0018', dictCode: 'PD-D-0018', dictName: '霜霉病', dictType: 'disease', targetCrops: '黄瓜,甜瓜,西瓜,南瓜,白菜,甘蓝', description: '叶片出现黄褐色多角形病斑，背面产生灰紫色霉层' },
  { id: 'PD-D-0019', dictCode: 'PD-D-0019', dictName: '白粉病', dictType: 'disease', targetCrops: '黄瓜,甜瓜,西瓜,南瓜,草莓,茄子', description: '叶片出现白色粉状霉层，影响光合作用，严重时叶片干枯' },
  { id: 'PD-D-0020', dictCode: 'PD-D-0020', dictName: '细菌性角斑病', dictType: 'disease', targetCrops: '黄瓜,甜瓜,西瓜', description: '叶片出现水浸状小斑点，扩大后形成多角形病斑' },
  { id: 'PD-D-0021', dictCode: 'PD-D-0021', dictName: '褐斑病', dictType: 'disease', targetCrops: '黄瓜,番茄,茄子', description: '叶片出现褐色圆形或椭圆形病斑，后期穿孔' },
  { id: 'PD-D-0022', dictCode: 'PD-D-0022', dictName: '炭疽病', dictType: 'disease', targetCrops: '黄瓜,番茄,辣椒,茄子,草莓,西瓜', description: '叶片出现红褐色圆形斑，果实出现凹陷斑，潮湿条件下产生粉红色粘液' },
  { id: 'PD-D-0023', dictCode: 'PD-D-0023', dictName: '疫病', dictType: 'disease', targetCrops: '黄瓜,西瓜,甜瓜,辣椒,番茄', description: '茎基部水浸状缢缩，叶片出现暗绿色水浸状斑' },
  { id: 'PD-D-0024', dictCode: 'PD-D-0024', dictName: '猝倒病', dictType: 'disease', targetCrops: '番茄,茄子,辣椒,黄瓜,甘蓝', description: '幼苗茎基部出现水浸状斑，缢缩倒伏死亡' },
  { id: 'PD-D-0025', dictCode: 'PD-D-0025', dictName: '立枯病', dictType: 'disease', targetCrops: '番茄,茄子,辣椒,黄瓜,甘蓝', description: '幼苗茎基部出现椭圆形暗褐色病斑，逐渐枯死' },
  { id: 'PD-D-0026', dictCode: 'PD-D-0026', dictName: '黑星病', dictType: 'disease', targetCrops: '黄瓜,梨,苹果', description: '叶片、茎蔓、果实出现暗绿色病斑，后期产生黑色霉层' },
  { id: 'PD-D-0027', dictCode: 'PD-D-0027', dictName: '黑斑病', dictType: 'disease', targetCrops: '白菜,萝卜,甘蓝,油菜', description: '叶片出现灰褐色圆形斑，后期产生黑色霉层' },
  { id: 'PD-D-0028', dictCode: 'PD-D-0028', dictName: '黑腐病', dictType: 'disease', targetCrops: '白菜,萝卜,甘蓝,花椰菜', description: '细菌性病害，叶缘出现V字形黄褐色斑，茎髓部变黑干腐' },
  { id: 'PD-D-0029', dictCode: 'PD-D-0029', dictName: '软腐病', dictType: 'disease', targetCrops: '白菜,萝卜,甘蓝,胡萝卜', description: '细菌性软腐，从伤口开始腐烂，产生恶臭' },
  { id: 'PD-D-0030', dictCode: 'PD-D-0030', dictName: '病毒病(白菜)', dictType: 'disease', targetCrops: '白菜,萝卜,甘蓝', description: '叶片花叶、皱缩、畸形，植株矮化' },
  { id: 'PD-D-0031', dictCode: 'PD-D-0031', dictName: '锈病', dictType: 'disease', targetCrops: '豆类,葱类,瓜类', description: '叶片出现锈红色粉末状孢子堆，影响光合作用' },
  { id: 'PD-D-0032', dictCode: 'PD-D-0032', dictName: '细菌性斑点病', dictType: 'disease', targetCrops: '辣椒', description: '叶片出现水浸状小斑点，后期形成黑色小点' },
  { id: 'PD-D-0033', dictCode: 'PD-D-0033', dictName: '疫病(辣椒)', dictType: 'disease', targetCrops: '辣椒', description: '果实出现暗绿色水浸状斑，后期成为褐色僵果' },
  { id: 'PD-D-0034', dictCode: 'PD-D-0034', dictName: '根肿病', dictType: 'disease', targetCrops: '白菜,萝卜,甘蓝,油菜', description: '根部形成肿瘤，影响水分和养分吸收，植株萎蔫' },
  { id: 'PD-D-0035', dictCode: 'PD-D-0035', dictName: '灰斑病(花生)', dictType: 'disease', targetCrops: '花生,大豆', description: '叶片出现圆形灰褐色斑，后期产生黑色霉层' },
  { id: 'PD-D-0036', dictCode: 'PD-D-0036', dictName: '褐斑病(花生)', dictType: 'disease', targetCrops: '花生,大豆', description: '叶片出现褐色圆形斑，严重时叶片枯死' },
  { id: 'PD-D-0037', dictCode: 'PD-D-0037', dictName: '锈病(葱类)', dictType: 'disease', targetCrops: '大葱,洋葱,大蒜,韭菜', description: '叶片出现橙黄色至锈褐色斑点和孢子堆' },
  { id: 'PD-D-0038', dictCode: 'PD-D-0038', dictName: '紫斑病', dictType: 'disease', targetCrops: '大葱,洋葱,大蒜', description: '叶片出现椭圆形紫色病斑，后期产生灰色霉层' },
  { id: 'PD-D-0039', dictCode: 'PD-D-0039', dictName: '灰霉病(韭菜)', dictType: 'disease', targetCrops: '韭菜,大葱,大蒜', description: '叶片出现褐色病斑，潮湿条件下产生灰色霉层' },
  { id: 'PD-D-0040', dictCode: 'PD-D-0040', dictName: '疫病(马铃薯)', dictType: 'disease', targetCrops: '马铃薯,番茄', description: '叶片出现水浸状褐斑，块茎出现紫褐色病斑' },
];

/**
 * 填充病虫害字典数据
 */
export function seedPestDiseaseDict() {
  const db = getDatabase();
  const now = new Date().toISOString();

  // 检查是否已有数据
  const existingResult = db.exec('SELECT COUNT(*) as cnt FROM pest_disease_dict');
  const existingCount = existingResult.length > 0 && existingResult[0].values.length > 0 ? Number(existingResult[0].values[0][0]) : 0;
  if (existingCount > 0) {
    console.log(`[seedPestDiseaseDict] 病虫害字典已有 ${existingCount} 条数据，跳过填充`);
    return;
  }

  console.log('[seedPestDiseaseDict] 开始填充病虫害字典数据...');
  console.log(`[seedPestDiseaseDict] 插入 ${defaultPests.length} 条虫害数据`);

  // 插入虫害数据
  for (const item of defaultPests) {
    db.run(`
      INSERT INTO pest_disease_dict (id, dict_code, dict_name, dict_type, target_crops, description, status, create_time)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    `, [item.id, item.dictCode, item.dictName, item.dictType, item.targetCrops || null, item.description || null, now]);
  }

  console.log(`[seedPestDiseaseDict] 插入 ${defaultDiseases.length} 条病害数据`);

  // 插入病害数据
  for (const item of defaultDiseases) {
    db.run(`
      INSERT INTO pest_disease_dict (id, dict_code, dict_name, dict_type, target_crops, description, status, create_time)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    `, [item.id, item.dictCode, item.dictName, item.dictType, item.targetCrops || null, item.description || null, now]);
  }

  const finalResult = db.exec('SELECT COUNT(*) as cnt FROM pest_disease_dict');
  const totalCount = finalResult.length > 0 && finalResult[0].values.length > 0 ? Number(finalResult[0].values[0][0]) : 0;
  console.log(`[seedPestDiseaseDict] 填充完成，共计 ${totalCount} 条数据`);

  saveDatabase();
}

// 如果直接运行此脚本
if (require.main === module) {
  seedPestDiseaseDict();
}
