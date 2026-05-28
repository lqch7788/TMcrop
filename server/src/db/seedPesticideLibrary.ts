/**
 * 药剂知识库种子数据
 * 基于网络搜索的蔬菜水果病虫害防治药剂大全
 * 化学防治、生物防治、物理防治三大类
 * 草莓病虫害防治数据来源：
 * - 陆启闯《草莓病虫害防治汇总表》(2025.11)
 * - 有机草莓常见病虫害防治措施
 */

import { getDatabase, saveDatabase } from './index';

/** 生成唯一ID */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 生成药剂编码 */
function generateCode(controlType: string, index: number): string {
  const typeMap: Record<string, string> = { chemical: 'C', bio: 'B', physical: 'P' };
  const prefix = `PC-${typeMap[controlType] || 'X'}`;
  return `${prefix}-${String(index).padStart(4, '0')}`;
}

/**
 * 导入药剂知识库数据
 */
export function seedPesticideLibrary() {
  const db = getDatabase();

  // 检查是否已有数据（只在表为空时导入，避免清除用户数据）
  const existingResult = db.exec('SELECT COUNT(*) as cnt FROM pesticide_library');
  const existingCount = existingResult.length > 0 && existingResult[0].values.length > 0 ? Number(existingResult[0].values[0][0]) : 0;
  if (existingCount > 0) {
    console.log(`[seedPesticideLibrary] 药剂知识库已有 ${existingCount} 条数据，跳过导入`);
    return;
  }

  console.log('[seedPesticideLibrary] 开始导入药剂知识库种子数据...');

  const now = new Date().toISOString();
  let codeIndex = 1;

  // ==================== 化学防治药剂 ====================
  const chemicalPesticides = [
    // ===== 杀菌剂 - 霜霉病/晚疫病 =====
    { name: '代森锰锌', controlType: 'chemical', ingredient: '代森锰锌（Mancozeb）', mechanism: '抑制病原菌孢子萌发和菌丝生长，保护性杀菌剂', functionDesc: '广谱保护性杀菌剂，抑制病原菌孢子萌发。对霜霉病、炭疽病，叶斑病有良好预防效果。', tabooDesc: '不可与铜制剂和碱性农药混用。对豆类、莴苣等敏感作物可能产生药害。', targetPests: '霜霉病、炭疽病，叶斑病、疫病', specs: [
      { spec: '80%可湿性粉剂', manufacturer: '美国陶氏益农', dosage: '500-800', unit: '倍液' },
      { spec: '70%水分散粒剂', manufacturer: '江苏剑牌农化', dosage: '600-800', unit: '倍液' },
      { spec: '50%可湿性粉剂', manufacturer: '上海升联化工', dosage: '400-600', unit: '倍液' },
    ]},
    { name: '甲霜灵', controlType: 'chemical', ingredient: '甲霜灵（Metalaxyl）', mechanism: '内吸性，抑制病原菌蛋白质合成和菌丝生长', functionDesc: '内吸性杀菌剂，对霜霉病、晚疫病有特效。能被植物吸收并传导至全身。', tabooDesc: '单一药剂易产生抗药性，建议与保护剂复配使用。', targetPests: '霜霉病、晚疫病、疫霉病', specs: [
      { spec: '58%可湿性粉剂', manufacturer: '浙江东风化工', dosage: '500-600', unit: '倍液' },
      { spec: '25%可湿性粉剂', manufacturer: '山东恒丰化学', dosage: '400-500', unit: '倍液' },
    ]},
    { name: '霜脲氰', controlType: 'chemical', ingredient: '霜脲氰（Cymoxanil）', mechanism: '抑制病原菌菌丝生长和孢子萌发，治疗性杀菌剂', functionDesc: '治疗性杀菌剂，抑制病原菌菌丝生长。对霜霉病、晚疫病有效。', tabooDesc: '建议与代森锰锌等保护剂复配使用，延缓抗药性。', targetPests: '霜霉病、晚疫病、荔枝霜疫霉病', specs: [
      { spec: '72%可湿性粉剂', manufacturer: '山东省植保总站', dosage: '1000-1200', unit: '倍液' },
      { spec: '36%悬浮剂', manufacturer: '国产通用', dosage: '800-1000', unit: '倍液' },
    ]},
    { name: '烯酰吗啉', controlType: 'chemical', ingredient: '烯酰吗啉（Dimethomorph）', mechanism: '破坏病原菌细胞壁形成，抑制菌丝生长', functionDesc: '新型治疗性杀菌剂，对霜霉病、晚疫病特效。破坏病原菌细胞壁形成。', tabooDesc: '避免在高温强光下施药。对蜜蜂安全。', targetPests: '霜霉病、晚疫病、腐霉病', specs: [
      { spec: '50%可湿性粉剂', manufacturer: '巴斯夫', dosage: '1500-2000', unit: '倍液' },
      { spec: '50%水分散粒剂', manufacturer: '江苏常隆农化', dosage: '1500-2000', unit: '倍液' },
      { spec: '69%烯酰吗啉·锰锌', manufacturer: '巴斯夫', dosage: '800-1000', unit: '倍液' },
    ]},
    { name: '氟菌·霜霉威', controlType: 'chemical', ingredient: '氟吡菌胺+霜霉威盐酸盐（Fluopicolide+Propamocarb）', mechanism: '抑制病原菌线粒体呼吸作用和细胞分裂', functionDesc: '复配杀菌剂，兼具保护和治疗作用。对霜霉病、晚疫病、猝倒病有效。', tabooDesc: '不能与碱性农药混用。', targetPests: '霜霉病、晚疫病、猝倒病', specs: [
      { spec: '62.5g/L氟吡菌胺+625g/L霜霉威盐酸盐', manufacturer: '拜耳', dosage: '800-1000', unit: '倍液' },
    ]},

    // ===== 杀菌剂 - 灰霉病 =====
    { name: '腐霉利', controlType: 'chemical', ingredient: '腐霉利（Procymidone）', mechanism: '抑制病原菌孢子萌发和菌丝生长，接触性杀菌剂', functionDesc: '接触性杀菌剂，对灰霉病、菌核病有效。抑制病原菌孢子萌发和菌丝生长。', tabooDesc: '对玫瑰花等花卉敏感。花期慎用，建议用烟剂。', targetPests: '灰霉病、菌核病', specs: [
      { spec: '50%可湿性粉剂', manufacturer: '海南正业中农', dosage: '1000-1500', unit: '倍液' },
      { spec: '20%悬浮剂', manufacturer: '美国默赛', dosage: '800-1200', unit: '倍液' },
      { spec: '50%烟剂', manufacturer: '国产通用', dosage: '200-300', unit: '克/亩' },
    ]},
    { name: '异菌脲', controlType: 'chemical', ingredient: '异菌脲（Iprodione）', mechanism: '抑制病原菌菌丝生长和孢子萌发', functionDesc: '广谱杀菌剂，对灰霉病、早疫病、菌核病有效。', tabooDesc: '不能与强酸强碱农药混用。', targetPests: '灰霉病、早疫病、菌核病', specs: [
      { spec: '50%可湿性粉剂', manufacturer: '江苏七洲绿色化工', dosage: '1000-1500', unit: '倍液' },
      { spec: '50%悬浮剂', manufacturer: '法国罗纳普朗克', dosage: '1000-1200', unit: '倍液' },
    ]},
    { name: '啶酰菌胺', controlType: 'chemical', ingredient: '啶酰菌胺（Boscalid）', mechanism: '抑制病原菌线粒体呼吸作用，切断能量供应', functionDesc: '新型杀菌剂，对灰霉病，白粉病有特效。抑制病原菌呼吸作用。', tabooDesc: '建议与其他作用机制药剂轮换使用。', targetPests: '灰霉病，白粉病、菌核病', specs: [
      { spec: '50%水分散粒剂', manufacturer: '巴斯夫（凯泽）', dosage: '1000-1500', unit: '倍液' },
      { spec: '34%微粒剂', manufacturer: '巴斯夫', dosage: '1000-1500', unit: '倍液' },
    ]},
    { name: '咯菌腈', controlType: 'chemical', ingredient: '咯菌腈（Fludioxonil）', mechanism: '抑制病原菌菌丝生长，非内吸性保护剂', functionDesc: '非内吸性杀菌剂，对灰霉病、立枯病有效。用于种子处理和叶面喷雾。', tabooDesc: '对皮肤有刺激，操作时做好防护。', targetPests: '灰霉病、立枯病', specs: [
      { spec: '50%可湿性粉剂', manufacturer: '先正达', dosage: '3000-4000', unit: '倍液' },
    ]},
    { name: '嘧霉胺', controlType: 'chemical', ingredient: '嘧霉胺（Pyrimethanil）', mechanism: '抑制病原菌蛋白质合成，内吸性治疗剂', functionDesc: '内吸性杀菌剂，对灰霉病有特效。抑制病原菌蛋白质合成。', tabooDesc: '对豆类作物可能产生药害。花期用药需谨慎。', targetPests: '灰霉病', specs: [
      { spec: '40%悬浮剂', manufacturer: '拜耳', dosage: '1000-1500', unit: '倍液' },
      { spec: '20%可湿性粉剂', manufacturer: '国产通用', dosage: '800-1200', unit: '倍液' },
    ]},

    // ===== 杀菌剂 - 白粉病 =====
    { name: '三唑酮', controlType: 'chemical', ingredient: '三唑酮（Triadimefon）', mechanism: '抑制病原菌麦角甾醇合成，三唑类内吸性杀菌剂', functionDesc: '三唑类杀菌剂，对白粉病、锈病有特效。具内吸性，能被植物吸收。', tabooDesc: '高温多湿条件下可能产生药害。孕妇禁止接触。', targetPests: '白粉病、锈病', specs: [
      { spec: '25%乳油', manufacturer: '江苏克胜', dosage: '1500-2000', unit: '倍液' },
      { spec: '15%可湿性粉剂', manufacturer: '江苏七洲', dosage: '1000-1500', unit: '倍液' },
      { spec: '80%粉剂', manufacturer: '国产通用', dosage: '200-400', unit: '倍液' },
    ]},
    { name: '腈菌唑', controlType: 'chemical', ingredient: '腈菌唑（Myclobutanil）', mechanism: '抑制病原菌麦角甾醇合成，三唑类内吸性杀菌剂', functionDesc: '三唑类内吸性杀菌剂，对白粉病、锈病、黑星病有效。', tabooDesc: '不可与强酸强碱农药混用。', targetPests: '白粉病、锈病、黑星病', specs: [
      { spec: '40%悬浮剂', manufacturer: '台州市大鹏药业', dosage: '2000-3000', unit: '倍液' },
      { spec: '25%乳油', manufacturer: '一帆生物', dosage: '1500-2000', unit: '倍液' },
    ]},
    { name: '苯醚甲环唑', controlType: 'chemical', ingredient: '苯醚甲环唑（Difenoconazole）', mechanism: '抑制病原菌麦角甾醇合成，广谱内吸性杀菌剂', functionDesc: '广谱内吸性杀菌剂，对白粉病、炭疽病、黑斑病有效。', tabooDesc: '建议与其他杀菌剂轮换使用延缓抗药性。', targetPests: '白粉病、炭疽病、黑斑病', specs: [
      { spec: '10%水分散粒剂', manufacturer: '先正达', dosage: '1500-2000', unit: '倍液' },
      { spec: '40%悬浮剂', manufacturer: '宝然生物', dosage: '3000-4000', unit: '倍液' },
    ]},
    { name: '醚菌酯', controlType: 'chemical', ingredient: '醚菌酯（Kresoxim-methyl）', mechanism: '抑制病原菌线粒体呼吸作用，甲氧基丙烯酸酯类', functionDesc: '甲氧基丙烯酸酯类杀菌剂，对白粉病、霜霉病有效。具保护和治疗作用。', tabooDesc: '不易产生抗药性，可与其他药剂复配。', targetPests: '白粉病、霜霉病', specs: [
      { spec: '50%干悬浮剂', manufacturer: '巴斯夫', dosage: '3000-4000', unit: '倍液' },
      { spec: '30%悬浮剂', manufacturer: '国产通用', dosage: '1500-2500', unit: '倍液' },
    ]},
    { name: '戊唑醇', controlType: 'chemical', ingredient: '戊唑醇（Tebuconazole）', mechanism: '抑制病原菌麦角甾醇合成，三唑类内吸性杀菌剂', functionDesc: '广谱内吸性杀菌剂，对白粉病、炭疽病、锈病有效。', tabooDesc: '对鱼类有毒，施药时避免污染水源。', targetPests: '白粉病、炭疽病、锈病', specs: [
      { spec: '430g/L悬浮剂', manufacturer: '拜耳', dosage: '3000-4000', unit: '倍液' },
      { spec: '25%可湿性粉剂', manufacturer: '江苏苏滨', dosage: '2000-3000', unit: '倍液' },
    ]},

    // ===== 杀菌剂 - 炭疽病 =====
    { name: '咪鲜胺', controlType: 'chemical', ingredient: '咪鲜胺（Prochloraz）', mechanism: '抑制病原菌麦角甾醇合成，广谱治疗性杀菌剂', functionDesc: '广谱杀菌剂，对炭疽病、青霉病有效。具保护和治疗作用。', tabooDesc: '对芒果、柑橘采后处理效果好。', targetPests: '炭疽病、青霉病、蒂腐病', specs: [
      { spec: '50%可湿性粉剂', manufacturer: '江苏剑牌', dosage: '1500-2000', unit: '倍液' },
      { spec: '45%水乳剂', manufacturer: '海利尔', dosage: '500-1000', unit: '倍液' },
    ]},
    { name: '吡唑醚菌酯', controlType: 'chemical', ingredient: '吡唑醚菌酯（Pyraclostrobin）', mechanism: '抑制病原菌线粒体呼吸作用，甲氧基丙烯酸酯类', functionDesc: '新型甲氧基丙烯酸酯类杀菌剂，对炭疽病，白粉病、霜霉病有效。', tabooDesc: '对鱼类高毒，避免污染水源。', targetPests: '炭疽病，白粉病、霜霉病', specs: [
      { spec: '250g/L悬浮剂', manufacturer: '巴斯夫（凯润）', dosage: '2000-3000', unit: '倍液' },
      { spec: '20%乳油', manufacturer: '陕西丰得利', dosage: '1000-2000', unit: '倍液' },
    ]},

    // ===== 杀菌剂 - 细菌性病害 =====
    { name: '氢氧化铜', controlType: 'chemical', ingredient: '氢氧化铜（Copper hydroxide）', mechanism: '释放铜离子破坏病原菌细胞结构，保护性铜制剂', functionDesc: '保护性铜制剂，对细菌性角斑病、溃疡病有效。', tabooDesc: '高温高湿条件下可能产生药害。对铜敏感作物慎用。', targetPests: '细菌性角斑病、溃疡病、霜霉病', specs: [
      { spec: '77%可湿性粉剂', manufacturer: '美国富美实', dosage: '400-600', unit: '倍液' },
      { spec: '37.5%悬浮剂', manufacturer: '国产通用', dosage: '400-500', unit: '倍液' },
    ]},
    { name: '春雷霉素', controlType: 'chemical', ingredient: '春雷霉素（Kasugamycin）', mechanism: '抑制病原菌蛋白质合成，抗生素类杀菌剂', functionDesc: '抗生素类杀菌剂，对细菌性病害和真菌病害有效。具内吸性。', tabooDesc: '不能与碱性农药混用。对豆类作物可能产生药害。', targetPests: '细菌性角斑病、疮痂病、炭疽病', specs: [
      { spec: '2%水剂', manufacturer: '日本北兴', dosage: '500-600', unit: '倍液' },
      { spec: '6%水剂', manufacturer: '华北制药', dosage: '1000-1500', unit: '倍液' },
    ]},
    { name: '中生菌素', controlType: 'chemical', ingredient: '中生菌素（Zhongshengmycin）', mechanism: '抑制病原菌蛋白质合成，生物源杀菌剂', functionDesc: '生物源杀菌剂，对细菌性病害有效。具触杀和内吸作用。', tabooDesc: '不能与碱性农药混用。', targetPests: '细菌性角斑病、软腐病、青枯病', specs: [
      { spec: '3%水剂', manufacturer: '海南博士威', dosage: '800-1000', unit: '倍液' },
      { spec: '10%可湿性粉剂', manufacturer: '国产通用', dosage: '1000-1200', unit: '倍液' },
    ]},

    // ===== 杀菌剂 - 根部病害 =====
    { name: '恶霉灵', controlType: 'chemical', ingredient: '恶霉灵（Hymexazol）', mechanism: '内吸性，抑制病原菌菌丝生长', functionDesc: '内吸性杀菌剂，对立枯病、猝倒病、根腐病有效。', tabooDesc: '不能与强酸强碱农药混用。', targetPests: '立枯病、猝倒病、根腐病、枯萎病', specs: [
      { spec: '15%水剂', manufacturer: '陕西恒田', dosage: '1000-1500', unit: '倍液' },
      { spec: '30%水剂', manufacturer: '山东恒利达', dosage: '2000-2500', unit: '倍液' },
    ]},
    { name: '多菌灵', controlType: 'chemical', ingredient: '多菌灵（Carbendazim）', mechanism: '抑制病原菌细胞分裂，麦角甾醇合成抑制剂', functionDesc: '广谱内吸性杀菌剂，对多种真菌病害有效。', tabooDesc: '长期使用易产生抗药性，建议与其他药剂轮换。', targetPests: '枯萎病、炭疽病，白粉病', specs: [
      { spec: '50%可湿性粉剂', manufacturer: '江苏苏滨', dosage: '500-800', unit: '倍液' },
      { spec: '80%可湿性粉剂', manufacturer: '安徽华星', dosage: '800-1000', unit: '倍液' },
    ]},
    { name: '甲基硫菌灵', controlType: 'chemical', ingredient: '甲基硫菌灵（Thiophanate-methyl）', mechanism: '在植物体内转化为多菌灵，抑制病原菌菌丝生长', functionDesc: '广谱内吸性杀菌剂，对灰霉病，白粉病、炭疽病有效。', tabooDesc: '不能与含铜制剂混用。', targetPests: '灰霉病，白粉病、炭疽病', specs: [
      { spec: '70%可湿性粉剂', manufacturer: '日本曹达', dosage: '800-1000', unit: '倍液' },
      { spec: '50%悬浮剂', manufacturer: '国产通用', dosage: '500-800', unit: '倍液' },
    ]},

    // ===== 杀虫剂 - 蚜虫 =====
    { name: '吡虫啉', controlType: 'chemical', ingredient: '吡虫啉（Imidacloprid）', mechanism: '阻断害虫神经系统传导，新烟碱类内吸性杀虫剂', functionDesc: '新烟碱类内吸性杀虫剂，对蚜虫、粉虱，叶蝉特效。', tabooDesc: '对蜜蜂高毒，花期禁用。对蚕高毒，桑园附近禁用。', targetPests: '蚜虫、粉虱，叶蝉', specs: [
      { spec: '10%可湿性粉剂', manufacturer: '拜耳', dosage: '2000-4000', unit: '倍液' },
      { spec: '70%水分散粒剂', manufacturer: '江苏长青', dosage: '8000-10000', unit: '倍液' },
      { spec: '5%乳油', manufacturer: '江苏长青', dosage: '2000-3000', unit: '倍液' },
    ]},
    { name: '啶虫脒', controlType: 'chemical', ingredient: '啶虫脒（Acetamiprid）', mechanism: '阻断害虫神经系统传导，新烟碱类触杀和内吸杀虫剂', functionDesc: '新烟碱类触杀和内吸杀虫剂，对蚜虫，白粉虱有效。', tabooDesc: '对蜜蜂有毒，花期慎用。', targetPests: '蚜虫，白粉虱', specs: [
      { spec: '20%可溶性粉剂', manufacturer: '江苏激素', dosage: '2000-3000', unit: '倍液' },
      { spec: '3%乳油', manufacturer: '江苏激素', dosage: '1500-2000', unit: '倍液' },
      { spec: '40%水分散粒剂', manufacturer: '国产通用', dosage: '6000-8000', unit: '倍液' },
    ]},
    { name: '噻虫嗪', controlType: 'chemical', ingredient: '噻虫嗪（Thiamethoxam）', mechanism: '阻断害虫神经系统传导，新烟碱类内吸性杀虫剂', functionDesc: '新烟碱类内吸性杀虫剂，对蚜虫、粉虱有特效。持效期长。', tabooDesc: '对蜜蜂高毒，花期禁用。', targetPests: '蚜虫、粉虱', specs: [
      { spec: '25%水分散粒剂', manufacturer: '先正达', dosage: '3000-4000', unit: '倍液' },
      { spec: '70%种子处理剂', manufacturer: '先正达', dosage: '按种子量1%', unit: '拌种' },
    ]},
    { name: '氟啶虫胺腈', controlType: 'chemical', ingredient: '氟啶虫胺腈（Sulfoxaflor）', mechanism: '阻断害虫神经系统传导，新型杀虫剂', functionDesc: '新型杀虫剂，对蚜虫、粉虱、盲蝽有效。', tabooDesc: '对蜜蜂有毒，施药时避免在花期使用。', targetPests: '蚜虫、粉虱、盲蝽', specs: [
      { spec: '50%水分散粒剂', manufacturer: '陶氏益农', dosage: '4000-5000', unit: '倍液' },
      { spec: '22%悬浮剂', manufacturer: '科迪华', dosage: '1500-2000', unit: '倍液' },
    ]},

    // ===== 杀虫剂 - 菜青虫/小菜蛾 =====
    { name: '高效氯氟氰菊酯', controlType: 'chemical', ingredient: '高效氯氟氰菊酯（Lambda-cyhalothrin）', mechanism: '增强害虫神经递质释放，拟除虫菊酯类触杀性杀虫剂', functionDesc: '拟除虫菊酯类触杀性杀虫剂，对菜青虫、蚜虫、玉米螟有效。', tabooDesc: '对蜜蜂、鱼、蚕高毒。花期禁用。', targetPests: '菜青虫、蚜虫、玉米螟、小菜蛾', specs: [
      { spec: '2.5%乳油', manufacturer: '扬农化工', dosage: '1500-2000', unit: '倍液' },
      { spec: '5%水乳剂', manufacturer: '深圳诺普信', dosage: '2000-3000', unit: '倍液' },
    ]},
    { name: '氯氰菊酯', controlType: 'chemical', ingredient: '氯氰菊酯（Cypermethrin）', mechanism: '增强害虫神经递质释放，拟除虫菊酯类触杀性杀虫剂', functionDesc: '拟除虫菊酯类触杀性杀虫剂，对菜青虫、小菜蛾有效。', tabooDesc: '对蜜蜂、鱼类、蚕高毒。', targetPests: '菜青虫、小菜蛾、蚜虫', specs: [
      { spec: '4.5%乳油', manufacturer: '广东立威', dosage: '1500-2000', unit: '倍液' },
      { spec: '10%可湿性粉剂', manufacturer: '江苏扬农', dosage: '2000-3000', unit: '倍液' },
    ]},
    { name: '溴氰菊酯', controlType: 'chemical', ingredient: '溴氰菊酯（Deltamethrin）', mechanism: '增强害虫神经递质释放，拟除虫菊酯类高效杀虫剂', functionDesc: '高效拟除虫菊酯类杀虫剂，活性高，击倒速度快。', tabooDesc: '对蜜蜂、鱼类、蚕高毒。', targetPests: '菜青虫、蚜虫', specs: [
      { spec: '2.5%乳油', manufacturer: '拜耳', dosage: '2000-3000', unit: '倍液' },
    ]},
    { name: '甲维盐', controlType: 'chemical', ingredient: '甲氨基阿维菌素苯甲酸盐（Emamectin benzoate）', mechanism: '阻断害虫神经传导，抗生素类杀虫剂', functionDesc: '抗生素类杀虫剂，对菜青虫、小菜蛾、蓟马有效。', tabooDesc: '对蜜蜂安全，但对蚕高毒。', targetPests: '菜青虫、小菜蛾、蓟马、棉铃虫', specs: [
      { spec: '1%乳油', manufacturer: '浙江升华拜克', dosage: '1500-2000', unit: '倍液' },
      { spec: '3%微乳剂', manufacturer: '江苏长青', dosage: '2000-3000', unit: '倍液' },
    ]},

    // ===== 杀虫剂 - 红蜘蛛/螨类 =====
    { name: '阿维菌素', controlType: 'chemical', ingredient: '阿维菌素（Abamectin）', mechanism: '增强神经递质释放，抗生素类触杀和胃毒杀螨剂', functionDesc: '抗生素类杀螨剂，对红蜘蛛，叶螨、蚜虫有效。具触杀和胃毒作用。', tabooDesc: '对蜜蜂安全。对鱼类有毒，避免污染水源。', targetPests: '红蜘蛛，叶螨、蚜虫', specs: [
      { spec: '1.8%乳油', manufacturer: '河北威远', dosage: '2000-3000', unit: '倍液' },
      { spec: '3.2%乳油', manufacturer: '浙江升华拜克', dosage: '4000-6000', unit: '倍液' },
      { spec: '5%乳油', manufacturer: '国产通用', dosage: '5000-7000', unit: '倍液' },
    ]},
    { name: '哒螨灵', controlType: 'chemical', ingredient: '哒螨灵（Pyridaben）', mechanism: '抑制害虫线粒体电子传递链，触杀性杀螨剂', functionDesc: '触杀性杀螨剂，对红蜘蛛、黄蜘蛛、锈壁虱有效。', tabooDesc: '对梨、苹果等果树敏感作物需谨慎使用。', targetPests: '红蜘蛛、黄蜘蛛、锈壁虱', specs: [
      { spec: '15%乳油', manufacturer: '江苏长青', dosage: '1500-2000', unit: '倍液' },
      { spec: '20%可湿性粉剂', manufacturer: '深圳诺普信', dosage: '3000-4000', unit: '倍液' },
    ]},
    { name: '炔螨特', controlType: 'chemical', ingredient: '炔螨特（Propargite）', mechanism: '触杀和胃毒作用，杀螨剂', functionDesc: '触杀和胃毒性杀螨剂，对红蜘蛛、锈壁虱有效。', tabooDesc: '高温高湿条件下可能产生药害。对嫩小作物敏感。不可与波尔多液混用。', targetPests: '红蜘蛛、锈壁虱，叶螨', specs: [
      { spec: '73%乳油', manufacturer: '美国科聚亚', dosage: '2000-3000', unit: '倍液' },
      { spec: '57%乳油', manufacturer: '江苏克胜', dosage: '1500-2000', unit: '倍液' },
    ]},
    { name: '四螨嗪', controlType: 'chemical', ingredient: '四螨嗪（Clofentezine）', mechanism: '抑制螨类卵胚胎发育，杀卵剂', functionDesc: '杀卵剂，对红蜘蛛卵、若螨有效，对成螨效果差。', tabooDesc: '药效较慢，用药后10天显效。持效期长。', targetPests: '红蜘蛛（卵、若螨）', specs: [
      { spec: '20%悬浮剂', manufacturer: '江西中迅', dosage: '2000-2500', unit: '倍液' },
      { spec: '50%可湿性粉剂', manufacturer: '江西华兴', dosage: '4000-5000', unit: '倍液' },
    ]},
    { name: '乙螨唑', controlType: 'chemical', ingredient: '乙螨唑（Etoxazole）', mechanism: '抑制螨类卵胚胎形成，新型杀螨剂', functionDesc: '新型杀螨剂，抑制卵胚胎形成。对红蜘蛛各虫态有效。', tabooDesc: '对成螨无效但可致不育。', targetPests: '红蜘蛛、叶螨、二斑叶螨', specs: [
      { spec: '11%悬浮剂', manufacturer: '日本八洲化学', dosage: '5000-7500', unit: '倍液' },
    ]},
    { name: '螺螨酯', controlType: 'chemical', ingredient: '螺螨酯（Spirodiclofen）', mechanism: '抑制螨类脂肪合成，新型杀螨剂', functionDesc: '新型杀螨剂，抑制脂肪合成。对卵、幼螨、若螨有效。', tabooDesc: '对成螨效果差。建议在螨害发生初期使用。', targetPests: '红蜘蛛、黄蜘蛛、叶螨', specs: [
      { spec: '24%悬浮剂', manufacturer: '巴斯夫', dosage: '3600-4800', unit: '倍液' },
    ]},

    // ===== 杀虫剂 - 白粉虱 =====
    { name: '螺虫乙酯', controlType: 'chemical', ingredient: '螺虫乙酯（Spirotetramat）', mechanism: '抑制害虫脂肪合成，双向内吸性杀虫剂', functionDesc: '双向内吸性杀虫剂，对白粉虱、蚜虫、蓟马有效。持效期长。', tabooDesc: '对蜜蜂低毒，适合花期使用。', targetPests: '白粉虱、蚜虫、蓟马', specs: [
      { spec: '22.4%悬浮剂', manufacturer: '拜耳', dosage: '1500-3000', unit: '倍液' },
    ]},
    { name: '烯啶虫胺', controlType: 'chemical', ingredient: '烯啶虫胺（Nitenpyram）', mechanism: '阻断害虫神经系统传导，新烟碱类杀虫剂', functionDesc: '新烟碱类杀虫剂，对白粉虱、蚜虫有效。', tabooDesc: '对蜜蜂有毒。', targetPests: '白粉虱、蚜虫', specs: [
      { spec: '10%可溶性液剂', manufacturer: '江苏丰山', dosage: '2000-3000', unit: '倍液' },
      { spec: '60%可湿性粉剂', manufacturer: '江苏激素', dosage: '4000-6000', unit: '倍液' },
    ]},

    // ===== 杀虫剂 - 地下害虫 =====
    { name: '毒死蜱', controlType: 'chemical', ingredient: '毒死蜱（Chlorpyrifos）', mechanism: '抑制害虫胆碱酯酶，有机磷类触杀性杀虫剂', functionDesc: '有机磷类触杀性杀虫剂，对蛴螬、地老虎、蝼蛄有效。', tabooDesc: '对蜜蜂、鱼类高毒。已限制在蔬菜上使用。', targetPests: '蛴螬、地老虎、蝼蛄', specs: [
      { spec: '480g/L乳油', manufacturer: '陶氏', dosage: '800-1000', unit: '倍液' },
      { spec: '3%颗粒剂', manufacturer: '国产通用', dosage: '1-1.5', unit: '千克/亩' },
    ]},
    { name: '辛硫磷', controlType: 'chemical', ingredient: '辛硫磷（Phoxim）', mechanism: '抑制害虫胆碱酯酶，有机磷类触杀性杀虫剂', functionDesc: '有机磷类触杀性杀虫剂，对地下害虫有效。见光易分解。', tabooDesc: '傍晚施药效果好。不宜与碱性农药混用。', targetPests: '蛴螬、地老虎、蝼蛄', specs: [
      { spec: '40%乳油', manufacturer: '国产通用', dosage: '1000-1500', unit: '倍液' },
      { spec: '3%颗粒剂', manufacturer: '国产通用', dosage: '1.5-2', unit: '千克/亩' },
    ]},

    // ===== 杀虫剂 - 蓟马 =====
    { name: '乙基多杀菌素', controlType: 'chemical', ingredient: '乙基多杀菌素（Spinetoram）', mechanism: '激活害虫神经系统，生物源杀虫剂', functionDesc: '生物源杀虫剂，对蓟马、小菜蛾、甜菜夜蛾有效。', tabooDesc: '对蜜蜂安全。对蚕高毒。', targetPests: '蓟马、小菜蛾、甜菜夜蛾', specs: [
      { spec: '60%悬浮剂', manufacturer: '陶氏益农', dosage: '1500-2000', unit: '倍液' },
      { spec: '200g/L悬浮剂', manufacturer: '科迪华', dosage: '2000-3000', unit: '倍液' },
    ]},
    { name: '多杀霉素', controlType: 'chemical', ingredient: '多杀霉素（Spinosad）', mechanism: '激活害虫神经系统，生物源杀虫剂', functionDesc: '生物源杀虫剂，对蓟马、小菜蛾有效。', tabooDesc: '对蜜蜂安全。', targetPests: '蓟马、小菜蛾、甜菜夜蛾', specs: [
      { spec: '2.5%悬浮剂', manufacturer: '美国陶氏', dosage: '1000-1500', unit: '倍液' },
      { spec: '5%悬浮剂', manufacturer: '湖北速普尔', dosage: '2000-2500', unit: '倍液' },
    ]},

    // ===== 草莓白粉病专用药剂 =====
    { name: '氟硅唑', controlType: 'chemical', ingredient: '氟硅唑（Flusilazole）', mechanism: '抑制病原菌麦角甾醇合成，三唑类内吸性杀菌剂', functionDesc: '三唑类内吸性杀菌剂，对白粉病有特效。抑制病原菌麦角甾醇合成。', tabooDesc: '对梨、苹果等果树敏感。花期和幼果期慎用。', targetPests: '草莓白粉病', specs: [
      { spec: '40%乳油', manufacturer: '美国默赛', dosage: '2000-2500', unit: '倍液' },
      { spec: '10%水分散粒剂', manufacturer: '国产通用', dosage: '1500-2000', unit: '倍液' },
    ]},
    { name: '四氟醚唑', controlType: 'chemical', ingredient: '四氟醚唑（Tetraconazole）', mechanism: '抑制病原菌麦角甾醇合成，新型三唑类杀菌剂', functionDesc: '新型三唑类杀菌剂，对白粉病有效。具保护和治疗作用。', tabooDesc: '不能与强酸强碱农药混用。', targetPests: '草莓白粉病', specs: [
      { spec: '25%悬浮剂', manufacturer: '日本石原产业', dosage: '2000-3000', unit: '倍液' },
    ]},
    { name: '乙嘧酚', controlType: 'chemical', ingredient: '乙嘧酚（Ethirimol）', mechanism: '抑制病原菌菌丝生长，嘧啶类内吸性杀菌剂', functionDesc: '嘧啶类内吸性杀菌剂，对白粉病有特效。', tabooDesc: '高温条件下效果更好。', targetPests: '草莓白粉病', specs: [
      { spec: '25%悬浮剂', manufacturer: '江苏剑牌', dosage: '3000-4000', unit: '倍液' },
    ]},

    // ===== 草莓灰霉病复配方案 =====
    { name: '百菌清·腐霉利', controlType: 'chemical', ingredient: '百菌清+腐霉利（Chlorothalonil+Procymidone）', mechanism: '保护+治疗，复配杀菌剂', functionDesc: '复配杀菌剂，预防+治疗。对草莓灰霉病有特效，适合花期前后和结果期使用。', tabooDesc: '对玫瑰花等花卉敏感。不可与铜制剂混用。', targetPests: '草莓灰霉病', specs: [
      { spec: '75%百菌清+25%腐霉利可湿性粉剂', manufacturer: '海南正业', dosage: '百菌清600-800倍+腐霉利1000-1500倍', unit: '复配' },
      { spec: '烟剂', manufacturer: '国产通用', dosage: '200-300', unit: '克/亩' },
    ]},
    { name: '咯菌腈', controlType: 'chemical', ingredient: '咯菌腈（Fludioxonil）', mechanism: '抑制病原菌菌丝生长，非内吸性保护剂', functionDesc: '非内吸性杀菌剂，对灰霉病、立枯病有效。主要用于预防和早期治疗。', tabooDesc: '对皮肤有刺激性，操作时做好防护。', targetPests: '草莓灰霉病、立枯病', specs: [
      { spec: '50%可湿性粉剂', manufacturer: '先正达（卉友）', dosage: '3000-4000', unit: '倍液' },
    ]},

    // ===== 草莓炭疽病药剂 =====
    { name: '氟吡菌酰胺', controlType: 'chemical', ingredient: '氟吡菌酰胺（Fluopyram）', mechanism: '抑制病原菌线粒体呼吸，新型杀菌剂', functionDesc: '新型杀菌剂，对炭疽病，白粉病有效。具保护和治疗双重作用。', tabooDesc: '建议与其他杀菌剂轮换使用延缓抗药性。', targetPests: '草莓炭疽病，白粉病', specs: [
      { spec: '50%悬浮剂', manufacturer: '拜耳（露娜森）', dosage: '1500-2000', unit: '倍液' },
    ]},
    { name: '啶氧菌酯', controlType: 'chemical', ingredient: '啶氧菌酯（Picoxystrobin）', mechanism: '抑制病原菌线粒体呼吸，甲氧基丙烯酸酯类', functionDesc: '甲氧基丙烯酸酯类杀菌剂，对炭疽病，白粉病有效。', tabooDesc: '对鱼类高毒，避免污染水源。', targetPests: '草莓炭疽病，白粉病', specs: [
      { spec: '22.5%悬浮剂', manufacturer: '美国杜邦', dosage: '1500-2000', unit: '倍液' },
    ]},
    { name: '克菌丹', controlType: 'chemical', ingredient: '克菌丹（Captan）', mechanism: '保护性杀菌剂，抑制病原菌孢子萌发', functionDesc: '保护性杀菌剂，对炭疽病、灰霉病有效。', tabooDesc: '不可与碱性农药混用。对桃、油桃等果树敏感。', targetPests: '草莓炭疽病、灰霉病', specs: [
      { spec: '50%可湿性粉剂', manufacturer: '美国默赛', dosage: '600-800', unit: '倍液' },
    ]},

    // ===== 草莓蚜虫防治补充 =====
    { name: '呋虫胺', controlType: 'chemical', ingredient: '呋虫胺（Dinotefuran）', mechanism: '阻断害虫神经系统传导，新烟碱类杀虫剂', functionDesc: '新烟碱类杀虫剂，对蚜虫、粉虱、蓟马有效。渗透性强，持效期长。', tabooDesc: '对蜜蜂有毒，花期禁用。对蚕高毒。', targetPests: '草莓蚜虫、粉虱、蓟马', specs: [
      { spec: '20%水分散粒剂', manufacturer: '日本三井', dosage: '3000-4000', unit: '倍液' },
      { spec: '10%可溶液剂', manufacturer: '国产通用', dosage: '2000-3000', unit: '倍液' },
    ]},
    { name: '噻虫嗪', controlType: 'chemical', ingredient: '噻虫嗪（Thiamethoxam）', mechanism: '阻断害虫神经系统传导，新烟碱类内吸性杀虫剂', functionDesc: '新烟碱类内吸性杀虫剂，对蚜虫、粉虱有特效。持效期长，可灌根使用。', tabooDesc: '对蜜蜂高毒，花期禁用。对蚕高毒。', targetPests: '草莓蚜虫、粉虱', specs: [
      { spec: '25%水分散粒剂', manufacturer: '瑞士先正达', dosage: '3000-4000', unit: '倍液' },
      { spec: '70%种子处理可分散粉剂', manufacturer: '国产通用', dosage: '种子包衣', unit: '1:50-100' },
    ]},
    { name: '啶虫脒', controlType: 'chemical', ingredient: '啶虫脒（Acetamiprid）', mechanism: '阻断害虫神经系统传导，新烟碱类触杀和内吸杀虫剂', functionDesc: '新烟碱类触杀和内吸杀虫剂，对蚜虫、粉虱有效。速效性好。', tabooDesc: '对蜜蜂有毒，花期慎用。', targetPests: '草莓蚜虫、粉虱', specs: [
      { spec: '20%可溶性粉剂', manufacturer: '江苏克胜', dosage: '2500-3000', unit: '倍液' },
      { spec: '3%乳油', manufacturer: '青岛海利来', dosage: '1500-2000', unit: '倍液' },
    ]},

    // ===== 草莓红蜘蛛防治补充 =====
    { name: '联苯肼酯', controlType: 'chemical', ingredient: '联苯肼酯（Bifenazate）', mechanism: '抑制害虫线粒体ATP合酶，新型杀螨剂', functionDesc: '新型杀螨剂，对红蜘蛛各虫态有效。击倒速度快，持效期长。', tabooDesc: '对蜜蜂和捕食螨安全。对天敌友好。', targetPests: '草莓红蜘蛛、二斑叶螨', specs: [
      { spec: '43%悬浮剂', manufacturer: '美国科聚亚', dosage: '2000-3000', unit: '倍液' },
      { spec: '20%悬浮剂', manufacturer: '国产通用', dosage: '1500-2500', unit: '倍液' },
    ]},
    { name: '丁氟螨酯', controlType: 'chemical', ingredient: '丁氟螨酯（Cyflumetofen）', mechanism: '抑制螨类线粒体电子传递链，新型杀螨剂', functionDesc: '新型杀螨剂，对红蜘蛛卵、若螨、成螨均有效。', tabooDesc: '对成螨效果较弱。对捕食螨安全。', targetPests: '草莓红蜘蛛、二斑叶螨', specs: [
      { spec: '20%悬浮剂', manufacturer: '日本日产', dosage: '1500-2000', unit: '倍液' },
    ]},
    { name: '乙螨唑', controlType: 'chemical', ingredient: '乙螨唑（Etoxazole）', mechanism: '抑制螨类卵胚胎形成，新型杀螨剂', functionDesc: '新型杀螨剂，抑制卵胚胎形成。对红蜘蛛各虫态有效，对成螨可致不育。', tabooDesc: '对成螨无效但可致不育。建议在螨害发生初期使用。', targetPests: '草莓红蜘蛛、二斑叶螨', specs: [
      { spec: '30%悬浮剂', manufacturer: '日本八洲', dosage: '4000-5000', unit: '倍液' },
    ]},
    { name: '四螨嗪', controlType: 'chemical', ingredient: '四螨嗪（Clofentezine）', mechanism: '抑制螨类卵胚胎发育，杀卵剂', functionDesc: '杀螨卵剂，对红蜘蛛卵、若螨有效，对成螨效果差。持效期长。', tabooDesc: '药效较慢，用药后7-10天显效。建议与杀成螨剂复配使用。', targetPests: '草莓红蜘蛛（卵、若螨）', specs: [
      { spec: '50%悬浮剂', manufacturer: '美国科聚亚', dosage: '4000-5000', unit: '倍液' },
    ]},

    // ===== 草莓蓟马防治 =====
    { name: '乙基多杀菌素', controlType: 'chemical', ingredient: '乙基多杀菌素（Spinetoram）', mechanism: '激活害虫神经系统，生物源杀虫剂', functionDesc: '生物源杀虫剂，对蓟马、小菜蛾、甜菜夜蛾有效。触杀和胃毒作用。', tabooDesc: '对蜜蜂安全。对蚕高毒。', targetPests: '草莓蓟马、甜菜夜蛾', specs: [
      { spec: '60克/升悬浮剂', manufacturer: '美国陶氏益农', dosage: '2000-3000', unit: '倍液' },
    ]},
    { name: '螺虫乙酯', controlType: 'chemical', ingredient: '螺虫乙酯（Spirotetramat）', mechanism: '抑制害虫脂肪合成，双向内吸性杀虫剂', functionDesc: '双向内吸性杀虫剂，对白粉虱、蚜虫、蓟马有效。持效期长。', tabooDesc: '对蜜蜂低毒，适合花期使用。', targetPests: '草莓蓟马、蚜虫、粉虱', specs: [
      { spec: '22.4%悬浮剂', manufacturer: '拜耳（亩旺特）', dosage: '2500-3000', unit: '倍液' },
    ]},

    // ===== 草莓斜纹夜蛾/菜青虫防治 =====
    { name: '溴氰菊酯', controlType: 'chemical', ingredient: '溴氰菊酯（Deltamethrin）', mechanism: '增强害虫神经递质释放，拟除虫菊酯类触杀性杀虫剂', functionDesc: '拟除虫菊酯类触杀性杀虫剂，活性高，击倒速度快。对斜纹夜蛾、菜青虫有效。', tabooDesc: '对蜜蜂、鱼类、蚕高毒。', targetPests: '草莓斜纹夜蛾、菜青虫', specs: [
      { spec: '25%乳油', manufacturer: '法国安万特', dosage: '3000-4000', unit: '倍液' },
      { spec: '2.5%可湿性粉剂', manufacturer: '国产通用', dosage: '1000-1500', unit: '倍液' },
    ]},
  ];

  // ==================== 生物防治药剂 ====================
  const bioPesticides = [
    // ===== 微生物杀菌剂 =====
    { name: '枯草芽孢杆菌', controlType: 'bio', ingredient: '枯草芽孢杆菌（Bacillus subtilis）', mechanism: '竞争性抑制病原菌，产生抗生素提高植物免疫力', functionDesc: '细菌性生物杀菌剂，抑制病原菌生长。产生抗生素提高植物免疫力。对白粉病、灰霉病、炭疽病有效。', tabooDesc: '不能与杀菌剂混用。建议与哈茨木霉菌复配使用。', targetPests: '白粉病、灰霉病、炭疽病、枯萎病', specs: [
      { spec: '1000亿活芽孢/克可湿性粉剂', manufacturer: '武汉科诺', dosage: '500-1000', unit: '倍液' },
      { spec: '100亿活芽孢/克可湿性粉剂', manufacturer: '美国拜沃', dosage: '300-500', unit: '倍液' },
      { spec: '10亿个/克可湿性粉剂', manufacturer: '云南星耀', dosage: '200-400', unit: '倍液' },
    ]},
    { name: '哈茨木霉菌', controlType: 'bio', ingredient: '哈茨木霉（Trichoderma harzianum）', mechanism: '寄生性竞争病原菌，分泌细胞壁降解酶', functionDesc: '真菌性生物杀菌剂，对灰霉病，白粉病、霜霉病、立枯病有效。', tabooDesc: '不能与化学杀菌剂混用。选择正规产品确保活性。', targetPests: '灰霉病，白粉病、霜霉病、立枯病', specs: [
      { spec: '5亿/克可湿性粉剂', manufacturer: '天津沃森特', dosage: '1000-1500', unit: '倍液' },
      { spec: '3亿CFU/克可湿性粉剂', manufacturer: '潍坊瑞辰', dosage: '300-500', unit: '倍液' },
    ]},
    { name: '苏云金杆菌(Bt)', controlType: 'bio', ingredient: '苏云金杆菌（Bacillus thuringiensis）', mechanism: '产生Cry蛋白破坏害虫肠道上皮细胞', functionDesc: '细菌性生物杀虫剂，产生Cry蛋白破坏害虫肠道。对菜青虫、小菜蛾、甜菜夜蛾有效。', tabooDesc: '对蚕高毒，桑园禁用。对螨类和蚜虫无效。阳光照射易失活。', targetPests: '菜青虫、小菜蛾、甜菜夜蛾、斜纹夜蛾', specs: [
      { spec: '16000IU/毫克可湿性粉剂', manufacturer: '武汉楚强', dosage: '2000-3000', unit: '倍液' },
      { spec: '8000IU/微升悬浮剂', manufacturer: '山东泰诺', dosage: '500-1000', unit: '倍液' },
      { spec: '100亿活芽孢/克可湿性粉剂', manufacturer: '福建绿安', dosage: '100-150', unit: '克/亩' },
    ]},
    { name: '白僵菌', controlType: 'bio', ingredient: '白僵菌（Beauveria bassiana）', mechanism: '孢子侵入虫体产生菌丝，分泌毒素致死', functionDesc: '真菌性杀虫剂，孢子侵入虫体产生菌丝致死。对玉米螟、菜青虫、蚜虫有效。', tabooDesc: '对蚕高毒。不能与杀菌剂混用。需高温高湿环境。', targetPests: '玉米螟、菜青虫、蚜虫、蛴螬', specs: [
      { spec: '100亿孢子/克可湿性粉剂', manufacturer: '山东绿陇', dosage: '1亿孢子/毫升', unit: '喷雾' },
      { spec: '1000亿孢子/克高孢粉', manufacturer: '湖南绿陇', dosage: '20-30', unit: '克/亩' },
    ]},
    { name: '绿僵菌', controlType: 'bio', ingredient: '绿僵菌（Metarhizium anisopliae）', mechanism: '孢子侵入虫体产生毒素，致死', functionDesc: '真菌性杀虫剂，对蝗虫、蛴螬、小菜蛾有效。', tabooDesc: '对湿度要求高。不能与杀菌剂混用。', targetPests: '蝗虫、蛴螬、小菜蛾', specs: [
      { spec: '23亿-28亿孢子/克菌粉', manufacturer: '湖北启明', dosage: '2-3', unit: '千克/亩' },
      { spec: '100亿孢子/克可湿性粉剂', manufacturer: '国产通用', dosage: '1000', unit: '倍液' },
    ]},
    { name: '核型多角体病毒(NPV)', controlType: 'bio', ingredient: '核型多角体病毒（Nuclear Polyhedrosis Virus）', mechanism: '病毒在害虫体内繁殖，致死', functionDesc: '病毒类生物农药，害虫取食后病毒在体内繁殖致死。对斜纹夜蛾、甜菜夜蛾、小菜蛾有效。', tabooDesc: '怕紫外线，傍晚或阴天使用。不能与碱性农药混用。', targetPests: '斜纹夜蛾、甜菜夜蛾、小菜蛾、棉铃虫', specs: [
      { spec: '20亿PIB/毫升悬浮剂', manufacturer: '国产通用', dosage: '1000-1500', unit: '倍液' },
      { spec: '10亿PIB/毫升悬浮剂', manufacturer: '国产通用', dosage: '100', unit: '毫升/亩' },
    ]},

    // ===== 植物源农药 =====
    { name: '苦参碱', controlType: 'bio', ingredient: '苦参碱（Matrine）', mechanism: '触杀和胃毒作用，破坏害虫神经系统', functionDesc: '植物源杀虫剂，触杀和胃毒作用。对蚜虫，红蜘蛛、菜青虫有效。', tabooDesc: '避免与碱性农药混用。下午施药效果更佳。', targetPests: '蚜虫，红蜘蛛、菜青虫、小菜蛾', specs: [
      { spec: '0.36%水剂', manufacturer: '赤峰中农大', dosage: '800-1000', unit: '倍液' },
      { spec: '0.5%水剂', manufacturer: '国产通用', dosage: '500-1000', unit: '倍液' },
      { spec: '1%可溶性液剂', manufacturer: '赤峰中农大', dosage: '1000-1500', unit: '倍液' },
    ]},
    { name: '印楝素', controlType: 'bio', ingredient: '印楝素（Azadirachtin）', mechanism: '驱避和拒食作用，干扰害虫生长发育', functionDesc: '植物源杀虫剂，对小菜蛾、蚜虫、蓟马有效。驱避和拒食作用。', tabooDesc: '遇光易分解，傍晚或阴天使用。降解快，残留少。', targetPests: '小菜蛾、蚜虫、蓟马、斜纹夜蛾', specs: [
      { spec: '0.3%乳油', manufacturer: '云南创森', dosage: '1000-2000', unit: '倍液' },
      { spec: '0.7%乳油', manufacturer: '北京清源保', dosage: '1500-2500', unit: '倍液' },
    ]},
    { name: '除虫菊素', controlType: 'bio', ingredient: '除虫菊素（Pyrethrins）', mechanism: '迅速击倒害虫，触杀作用', functionDesc: '植物源杀虫剂，触杀作用。1-2分钟内击倒害虫。', tabooDesc: '对蜜蜂有毒。对鱼高毒。', targetPests: '蚜虫、菜青虫，叶蝉、蓟马', specs: [
      { spec: '5%乳油', manufacturer: '北京清源保', dosage: '1000-2000', unit: '倍液' },
      { spec: '1.5%水乳剂', manufacturer: '云南创森', dosage: '1000-2000', unit: '倍液' },
    ]},
    { name: '鱼藤酮', controlType: 'bio', ingredient: '鱼藤酮（Rotenone）', mechanism: '抑制害虫电子传递链，触杀和胃毒', functionDesc: '植物源杀虫剂，触杀和胃毒。对蚜虫、菜青虫有效。', tabooDesc: '对鱼高毒，鱼塘禁用。遇光易分解。', targetPests: '蚜虫、菜青虫、小菜蛾', specs: [
      { spec: '2.5%乳油', manufacturer: '国产通用', dosage: '750-1000', unit: '倍液' },
      { spec: '7.5%乳油', manufacturer: '国产通用', dosage: '1500', unit: '倍液' },
    ]},
    { name: '蛇床子素', controlType: 'bio', ingredient: '蛇床子素（Osthol）', mechanism: '抑菌和驱虫作用，植物源杀菌剂', functionDesc: '植物源杀菌剂，对白粉病、灰霉病、菜青虫有效。', tabooDesc: '不能与碱性农药混用。对蜜蜂安全。', targetPests: '白粉病、灰霉病、菜青虫', specs: [
      { spec: '0.4%乳油', manufacturer: '武汉天惠之', dosage: '800-1200', unit: '倍液' },
      { spec: '1%水乳剂', manufacturer: '国产通用', dosage: '1000-1500', unit: '倍液' },
    ]},
    { name: '藜芦碱', controlType: 'bio', ingredient: '藜芦碱（Veratrine）', mechanism: '破坏害虫神经系统，触杀作用', functionDesc: '植物源杀虫剂，破坏害虫神经系统。对蚜虫，红蜘蛛、菜青虫有效。', tabooDesc: '对眼睛有刺激性。避免与酸性农药混用。', targetPests: '蚜虫、红蜘蛛、菜青虫', specs: [
      { spec: '0.5%可溶性液剂', manufacturer: '国产通用', dosage: '300-500', unit: '倍液' },
    ]},

    // ===== 天敌昆虫 =====
    { name: '智利小植绥螨', controlType: 'bio', ingredient: '智利小植绥螨（Phytoseiulus persimilis）', mechanism: '捕食螨类天敌，以红蜘蛛为唯一食物', functionDesc: '捕食螨类天敌，以红蜘蛛为唯一食物。对二斑叶螨、朱砂叶螨有效。', tabooDesc: '释放后30天内禁止喷洒农药。释放时温度20-30℃为宜。', targetPests: '红蜘蛛、二斑叶螨', specs: [
      { spec: '活螨', manufacturer: '商业天敌公司', dosage: '5-10', unit: '万头/亩' },
    ]},
    { name: '胡瓜钝绥螨', controlType: 'bio', ingredient: '胡瓜钝绥螨（Amblyseius cucumeris）', mechanism: '捕食螨类天敌，捕食红蜘蛛和蓟马', functionDesc: '捕食螨类天敌，对红蜘蛛、蓟马有效。', tabooDesc: '喜高湿环境。对化学农药敏感。', targetPests: '红蜘蛛、蓟马', specs: [
      { spec: '活螨', manufacturer: '商业天敌公司', dosage: '5-10', unit: '万头/亩' },
    ]},
    { name: '赤眼蜂', controlType: 'bio', ingredient: '赤眼蜂（Trichogramma）', mechanism: '寄生性天敌，寄生害虫卵', functionDesc: '寄生性天敌昆虫，寄生害虫卵。对棉铃虫、菜青虫、小菜蛾有效。', tabooDesc: '放蜂1-4天降大雨对效果有影响。', targetPests: '棉铃虫、菜青虫、小菜蛾、斜纹夜蛾', specs: [
      { spec: '蜂卡', manufacturer: '商业天敌公司', dosage: '1-3', unit: '万头/亩' },
    ]},
    { name: '丽蚜小蜂', controlType: 'bio', ingredient: '丽蚜小蜂（Encarsia formosa）', mechanism: '寄生性天敌，寄生粉虱若虫和蛹', functionDesc: '寄生性天敌，寄生粉虱若虫和蛹。对温室白粉虱、烟粉虱有效。', tabooDesc: '对化学农药极敏感。', targetPests: '温室白粉虱、烟粉虱', specs: [
      { spec: '蜂卡', manufacturer: '商业天敌公司', dosage: '2000-3000', unit: '头/亩' },
    ]},

    // ===== 其他生物制剂 =====
    { name: '宁南霉素', controlType: 'bio', ingredient: '宁南霉素（Ningnanmycin）', mechanism: '抑制病毒复制，抗生素类杀菌剂', functionDesc: '抗生素类杀菌剂，对病毒病，白粉病有效。', tabooDesc: '不能与碱性农药混用。', targetPests: '病毒病，白粉病', specs: [
      { spec: '8%水剂', manufacturer: '黑龙江绥化', dosage: '200-250', unit: '倍液' },
      { spec: '10%可溶粉剂', manufacturer: '国产通用', dosage: '1000-1200', unit: '倍液' },
    ]},
    { name: '多抗霉素', controlType: 'bio', ingredient: '多抗霉素（Polyoxin）', mechanism: '抑制病原菌蛋白质合成，抗生素类杀菌剂', functionDesc: '抗生素类杀菌剂，对灰霉病、斑点落叶病有效。', tabooDesc: '不能与碱性农药混用。安全间隔期短。', targetPests: '灰霉病、斑点落叶病', specs: [
      { spec: '10%可湿性粉剂', manufacturer: '日本科研', dosage: '1000-2000', unit: '倍液' },
      { spec: '2%水剂', manufacturer: '国产通用', dosage: '500-1000', unit: '倍液' },
    ]},
    { name: '中生菌素', controlType: 'bio', ingredient: '中生菌素（Zhongshengmycin）', mechanism: '抑制病原菌蛋白质合成，生物源杀菌剂', functionDesc: '生物源杀菌剂，对细菌性病害有效。', tabooDesc: '不能与碱性农药混用。', targetPests: '细菌性角斑病、软腐病', specs: [
      { spec: '3%水剂', manufacturer: '海南博士威', dosage: '800-1000', unit: '倍液' },
    ]},
    { name: '武夷菌素', controlType: 'bio', ingredient: '武夷菌素（Wuyimycin）', mechanism: '抑制病原菌生长，生物源杀菌剂', functionDesc: '生物源杀菌剂，对白粉病、灰霉病有效。', tabooDesc: '生物农药，安全性高。发病前预防为主。', targetPests: '白粉病、灰霉病', specs: [
      { spec: '2%水剂', manufacturer: '国产通用', dosage: '150', unit: '倍液' },
    ]},

    // ===== 草莓专用微生物杀菌剂 =====
    { name: '解淀粉芽孢杆菌', controlType: 'bio', ingredient: '解淀粉芽孢杆菌（Bacillus amyloliquefaciens）', mechanism: '竞争性抑制病原菌，分泌抗菌物质', functionDesc: '微生物杀菌剂，抑制病原菌生长。对草莓白粉病、灰霉病、炭疽病有效。促进植物生长。', tabooDesc: '不能与杀菌剂混用。选择正规产品确保活性。', targetPests: '草莓白粉病、灰霉病、炭疽病', specs: [
      { spec: '10亿CFU/克可湿性粉剂', manufacturer: '武汉科诺', dosage: '500-800', unit: '倍液' },
      { spec: '100亿活芽孢/克可湿性粉剂', manufacturer: '云南星耀', dosage: '1000-1500', unit: '倍液' },
    ]},
    { name: '萎菌灵', controlType: 'bio', ingredient: '萎菌灵（Wilmaniac）', mechanism: '抑制病原菌菌丝生长，微生物杀菌剂', functionDesc: '微生物杀菌剂，对草莓枯萎病、黄萎病有效。', tabooDesc: '不能与化学杀菌剂混用。', targetPests: '草莓枯萎病、黄萎病', specs: [
      { spec: '3%水剂', manufacturer: '国产通用', dosage: '300-500', unit: '倍液' },
    ]},
    { name: '木霉菌', controlType: 'bio', ingredient: '木霉（Trichoderma spp.）', mechanism: '寄生性竞争病原菌，分泌细胞壁降解酶', functionDesc: '哈茨木霉的商品名或同类菌株，对灰霉病，白粉病、立枯病有效。', tabooDesc: '不能与化学杀菌剂混用。选择正规产品确保活性。', targetPests: '草莓灰霉病，白粉病、立枯病', specs: [
      { spec: '特锐菌（哈茨木霉）3亿CFU/克', manufacturer: '德国拜耳', dosage: '300-500', unit: '倍液' },
      { spec: '5亿/克可湿性粉剂', manufacturer: '天津沃森特', dosage: '1000-1500', unit: '倍液' },
    ]},
  ];

  // ==================== 物理防治 ====================
  const physicalPesticides = [
    { name: '防虫网', controlType: 'physical', ingredient: '尼龙网/聚乙烯网', mechanism: '物理隔离，阻止害虫接触作物', functionDesc: '人工隔离屏障，阻止害虫进入。40目可阻蝴蝶，60目可阻蚜虫粉虱。', tabooDesc: '目数过大影响通风。根据害虫种类选择合适目数。', targetPests: '菜青虫、小菜蛾、蚜虫，白粉虱、斑潜蝇', specs: [
      { spec: '40目尼龙网', manufacturer: '通用', dosage: '全覆盖', unit: '覆盖' },
      { spec: '60目聚乙烯网', manufacturer: '通用', dosage: '全覆盖', unit: '覆盖' },
    ]},
    { name: '黄板', controlType: 'physical', ingredient: '黄色粘虫板', mechanism: '色板诱杀，利用害虫对黄色正趋向性', functionDesc: '色板诱杀，利用害虫对黄色趋性。诱杀蚜虫，白粉虱，叶蝉等。', tabooDesc: '定期更换。避免阳光直射导致粘性下降。', targetPests: '蚜虫，白粉虱，叶蝉、斑潜蝇', specs: [
      { spec: '20×25cm黄色粘虫板', manufacturer: '通用', dosage: '20-40', unit: '片/亩' },
      { spec: '25×40cm黄色粘虫板', manufacturer: '通用', dosage: '20-30', unit: '片/亩' },
    ]},
    { name: '蓝板', controlType: 'physical', ingredient: '蓝色粘虫板', mechanism: '色板诱杀，利用害虫对蓝色趋向性', functionDesc: '色板诱杀，利用害虫对蓝色趋性。诱杀蓟马、种蝇等。', tabooDesc: '悬挂高度与作物持平。', targetPests: '蓟马、种蝇，叶蝉', specs: [
      { spec: '25×30cm蓝色粘虫板', manufacturer: '通用', dosage: '20-30', unit: '片/亩' },
    ]},
    { name: '频振式杀虫灯', controlType: 'physical', ingredient: '杀虫灯', mechanism: '光波色味诱杀，利用害虫趋光性', functionDesc: '利用光、波、色、味四种方式诱杀害虫。每盏灯可控制30-50亩。', tabooDesc: '雨雾天气效果降低。定期清理灯管和接虫袋。', targetPests: '斜纹夜蛾、甜菜夜蛾、地老虎、金龟子', specs: [
      { spec: '频振式杀虫灯', manufacturer: '通用', dosage: '1', unit: '盏/30-50亩' },
      { spec: '太阳能杀虫灯', manufacturer: '通用', dosage: '1', unit: '盏/20-30亩' },
    ]},
    { name: '性诱剂', controlType: 'physical', ingredient: '昆虫性信息素', mechanism: '性信息素诱捕，干扰害虫交配', functionDesc: '利用害虫性信息素诱捕成虫。专一性强，只诱目标害虫。', tabooDesc: '需配套专用诱捕器。诱芯需冷藏保存。', targetPests: '小菜蛾、斜纹夜蛾、甜菜夜蛾、棉铃虫', specs: [
      { spec: '小菜蛾诱芯', manufacturer: '通用', dosage: '3-5', unit: '粒/亩' },
      { spec: '斜纹夜蛾诱芯', manufacturer: '通用', dosage: '1', unit: '个/亩' },
    ]},
    { name: '银灰膜', controlType: 'physical', ingredient: '银灰双色膜', mechanism: '驱避作用，利用蚜虫对银灰色负趋向性', functionDesc: '利用蚜虫对银灰色的负趋向性驱避蚜虫。兼有保温保湿作用。', tabooDesc: '铺设时银色面朝上。不能与除草剂混用。', targetPests: '蚜虫', specs: [
      { spec: '银灰双色膜0.008mm', manufacturer: '通用', dosage: '1.5', unit: '公斤/亩' },
    ]},
    { name: '糖醋液诱杀', controlType: 'physical', ingredient: '糖醋液', mechanism: '诱液诱杀，利用害虫对糖醋趋性', functionDesc: '利用害虫对糖醋液的趋性诱杀。夜蛾类、地老虎等。', tabooDesc: '每亩放3-5盆。白天盖好，晚上揭开。', targetPests: '斜纹夜蛾、甘蓝夜蛾、地老虎', specs: [
      { spec: '糖:醋:酒:水=3:4:1:2', manufacturer: '自制', dosage: '3-5', unit: '盆/亩' },
    ]},
    { name: '硫磺熏蒸器', controlType: 'physical', ingredient: '硫磺粉', mechanism: '熏蒸杀菌，抑制病原菌生长', functionDesc: '电热控温熏蒸，对白粉病、灰霉病有效。', tabooDesc: '必须使用医药硫磺。温度不能超过280℃。对蜜蜂安全。', targetPests: '白粉病、灰霉病', specs: [
      { spec: '99%硫磺粉', manufacturer: '医药级', dosage: '20-40', unit: '克/次/100m²' },
      { spec: '电热硫磺熏蒸罐', manufacturer: '通用', dosage: '1', unit: '台/100m²' },
    ]},
    { name: '粘虫胶', controlType: 'physical', ingredient: '粘虫胶', mechanism: '粘附诱杀，阻隔越冬害虫', functionDesc: '涂于树干诱杀沿树皮裂缝越冬的害虫。', tabooDesc: '定期更换。', targetPests: '梨星毛虫、梨小食心虫', specs: [
      { spec: '粘虫胶', manufacturer: '通用', dosage: '涂抹', unit: '树干' },
    ]},

    // ===== 草莓栽培专用物理防治方法 =====
    { name: '银灰地膜', controlType: 'physical', ingredient: '银灰双色膜', mechanism: '驱避作用，利用蚜虫对银灰色负趋向性', functionDesc: '利用蚜虫对银灰色的负趋向性驱避蚜虫，兼有保温保湿作用。草莓栽培中用于越冬前后防护。', tabooDesc: '铺设时银色面朝上。不能与除草剂混用。', targetPests: '草莓蚜虫', specs: [
      { spec: '银灰双色膜（宽1-1.2 m）', manufacturer: '通用', dosage: '全覆盖', unit: '覆膜栽培' },
    ]},
    { name: '黄色粘虫板（草莓蚜虫/粉虱）', controlType: 'physical', ingredient: '黄色粘虫板', mechanism: '色板诱杀，利用害虫对黄色正趋向性', functionDesc: '利用害虫对黄色趋性诱杀。每亩悬挂20-30块，悬挂高度距植株顶部10-15cm，每7-10天更换一次。', tabooDesc: '定期更换。避免阳光直射导致粘性下降。', targetPests: '草莓蚜虫、粉虱', specs: [
      { spec: '黄板（20cm×30cm）', manufacturer: '通用', dosage: '20-30', unit: '块/亩' },
      { spec: '加厚黄板', manufacturer: '通用', dosage: '35-40', unit: '块/亩（重度发生时）' },
    ]},
    { name: '蓝色粘虫板（草莓蓟马）', controlType: 'physical', ingredient: '蓝色粘虫板', mechanism: '色板诱杀，利用害虫对蓝色趋向性', functionDesc: '利用蓟马对蓝色趋性诱杀。悬挂高度与作物持平，重点布置园区周边。', tabooDesc: '悬挂高度与作物持平。', targetPests: '草莓蓟马', specs: [
      { spec: '蓝板（20cm×30cm）', manufacturer: '通用', dosage: '20-30', unit: '块/亩' },
    ]},
    { name: '性诱剂（草莓斜纹夜蛾/菜青虫）', controlType: 'physical', ingredient: '昆虫性信息素', mechanism: '性信息素诱捕，干扰害虫交配', functionDesc: '利用害虫性信息素诱捕成虫。专一性强，只诱目标害虫。每亩放置2-3个诱捕器。', tabooDesc: '需配套专用诱捕器。诱芯需冷藏保存。', targetPests: '草莓斜纹夜蛾、菜青虫', specs: [
      { spec: '斜纹夜蛾性诱剂', manufacturer: '通用', dosage: '2-3', unit: '个/亩' },
      { spec: '菜青虫性诱剂', manufacturer: '通用', dosage: '2-3', unit: '个/亩' },
    ]},
    { name: '糖醋液诱杀（草莓夜蛾类）', controlType: 'physical', ingredient: '糖醋液', mechanism: '诱液诱杀，利用害虫对糖醋趋性', functionDesc: '利用害虫对糖醋液的趋性诱杀。夜蛾类、地老虎等。每亩放3-5盆，白天盖好晚上揭开。', tabooDesc: '每亩3-5盆。白天盖好，晚上揭开。', targetPests: '草莓斜纹夜蛾、地老虎', specs: [
      { spec: '糖醋液（糖:醋:酒:水=3:1:3:10）', manufacturer: '自制', dosage: '3-5', unit: '盆/亩' },
    ]},
    { name: '硫磺熏蒸（草莓白粉病/灰霉病）', controlType: 'physical', ingredient: '硫磺粉', mechanism: '熏蒸杀菌，抑制病原菌生长', functionDesc: '电热控温熏蒸，对白粉病、灰霉病有效。草莓扣棚后使用，注意对棚室结构和叶片老化的影响，使用次数不宜过多。', tabooDesc: '必须使用医药硫磺。温度不能超过280℃。对蜜蜂安全。使用次数不宜过多，避免叶片老化。', targetPests: '草莓白粉病、灰霉病', specs: [
      { spec: '99%硫磺粉', manufacturer: '医药级', dosage: '20-40', unit: '克/次/100m²' },
      { spec: '硫磺熏蒸罐（电热式）', manufacturer: '通用', dosage: '1', unit: '台/100m²' },
    ]},
  ];

  // 导入所有药剂
  const allPesticides = [
    ...chemicalPesticides.map(p => ({ ...p, controlType: 'chemical' })),
    ...bioPesticides.map(p => ({ ...p, controlType: 'bio' })),
    ...physicalPesticides.map(p => ({ ...p, controlType: 'physical' })),
  ];

  let insertedCount = 0;
  const insertedIds: Record<string, string> = {};

  for (const pesticide of allPesticides) {
    const pesticideId = generateId('pl');
    const pesticideCode = generateCode(pesticide.controlType, codeIndex++);

    // 插入主表
    db.run(`
      INSERT INTO pesticide_library (
        id, pesticide_code, pesticide_name, control_type, function_desc, taboo_desc,
        target_pests, ingredient, mechanism, status, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pesticideId,
        pesticideCode,
        pesticide.name,
        pesticide.controlType,
        pesticide.functionDesc,
        pesticide.tabooDesc,
        pesticide.targetPests,
        pesticide.ingredient,
        pesticide.mechanism,
        'active',
        now,
        now
      ]
    );

    insertedIds[pesticide.name] = pesticideId;
    insertedCount++;

    // 插入规格子表
    if (pesticide.specs && pesticide.specs.length > 0) {
      for (const spec of pesticide.specs) {
        const specId = generateId('ps');
        db.run(`
          INSERT INTO pesticide_specs (
            id, pesticide_id, spec_content, formulation, manufacturer,
            suggested_dosage, dosage_unit, status, create_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            specId,
            pesticideId,
            spec.spec,
            null,
            spec.manufacturer,
            spec.dosage,
            spec.unit,
            'active',
            now
          ]
        );
      }
    }
  }

  saveDatabase();
  console.log(`药剂知识库种子数据导入完成：${insertedCount}种药剂`);
}

/**
 * 导出函数供外部调用
 */
export default seedPesticideLibrary;
