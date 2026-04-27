/**
 * 农产品编码规则配置
 *
 * 编码结构：类别(2位) + 类型(2位) + 品种(2位) + 子品种1(3位) + 详细品种(2位)
 * 总长度：11位
 * 注意：详细品种名称由用户在录入时手工输入，系统自动分配2位序号
 *
 * 示例：FR010100101
 * - FR: 水果类
 * - 01: 浆果类
 * - 01: 草莓
 * - 001: 红颜（子品种1）
 * - 后面的详细名称由用户录入时输入，如"大叶红颜"
 */

// 大类
export type ProduceCategoryCode = 'PD' | 'FR' | 'GR' | 'FL' | 'HB' | 'MG' | 'OT';

export interface ProduceCategory {
  code: ProduceCategoryCode;
  name: string;
  nameEn: string;
  description: string;
  types: ProduceType[];
}

// 中类（产品类型）
export interface ProduceType {
  code: string;
  name: string;
  subCategories: ProduceSubType[];
}

// 小类（产品品种）- 支持递归多级子品种
export interface ProduceSubType {
  code: string;
  name: string;
  // 支持多级子品种（用于草莓等需要细分品种的作物）
  subVarieties?: ProduceSubType[];
}

// ============================================
// 类型配置（必须在 produceCategories 之前定义）
// ============================================

// 蔬菜类（PD）类型配置
const produceTypesPD: ProduceType[] = [
  {
    code: '01',
    name: '叶菜类',
    subCategories: [
      {
        code: '01',
        name: '菠菜',
        subVarieties: [
          { code: '001', name: '圆叶菠菜' },
          { code: '002', name: '尖叶菠菜' },
          { code: '003', name: '大叶菠菜' },
          { code: '004', name: '小叶菠菜' },
          { code: '005', name: '日本菠菜' },
          { code: '099', name: '其他菠菜' },
        ],
      },
      {
        code: '02',
        name: '生菜',
        subVarieties: [
          { code: '001', name: '散叶生菜' },
          { code: '002', name: '结球生菜' },
          { code: '003', name: '罗马生菜' },
          { code: '004', name: '油麦生菜' },
          { code: '005', name: '紫叶生菜' },
          { code: '099', name: '其他生菜' },
        ],
      },
      {
        code: '03',
        name: '油麦菜',
        subVarieties: [
          { code: '001', name: '普通油麦菜' },
          { code: '002', name: '细叶油麦菜' },
          { code: '003', name: '大叶油麦菜' },
          { code: '099', name: '其他油麦菜' },
        ],
      },
      {
        code: '04',
        name: '小白菜',
        subVarieties: [
          { code: '001', name: '上海青' },
          { code: '002', name: '苏州青' },
          { code: '003', name: '矮脚青' },
          { code: '004', name: '白叶小白菜' },
          { code: '005', name: '黑叶小白菜' },
          { code: '099', name: '其他小白菜' },
        ],
      },
      {
        code: '05',
        name: '大白菜',
        subVarieties: [
          { code: '001', name: '北京白菜' },
          { code: '002', name: '山东白菜' },
          { code: '003', name: '娃娃白菜' },
          { code: '004', name: '黄心白菜' },
          { code: '005', name: '绿叶白菜' },
          { code: '099', name: '其他大白菜' },
        ],
      },
      {
        code: '06',
        name: '甘蓝',
        subVarieties: [
          { code: '001', name: '结球甘蓝' },
          { code: '002', name: '紫甘蓝' },
          { code: '003', name: '羽衣甘蓝' },
          { code: '004', name: '抱子甘蓝' },
          { code: '005', name: '皱叶甘蓝' },
          { code: '099', name: '其他甘蓝' },
        ],
      },
      { code: '07', name: '娃娃菜' },
      {
        code: '08',
        name: '茼蒿',
        subVarieties: [
          { code: '001', name: '大叶茼蒿' },
          { code: '002', name: '小叶茼蒿' },
          { code: '003', name: '花叶茼蒿' },
          { code: '099', name: '其他茼蒿' },
        ],
      },
      {
        code: '09',
        name: '香菜',
        subVarieties: [
          { code: '001', name: '大叶香菜' },
          { code: '002', name: '小叶香菜' },
          { code: '003', name: '铁杆香菜' },
          { code: '099', name: '其他香菜' },
        ],
      },
      {
        code: '10',
        name: '韭菜',
        subVarieties: [
          { code: '001', name: '宽叶韭菜' },
          { code: '002', name: '细叶韭菜' },
          { code: '003', name: '紫根韭菜' },
          { code: '004', name: '白根韭菜' },
          { code: '099', name: '其他韭菜' },
        ],
      },
      {
        code: '11',
        name: '芹菜',
        subVarieties: [
          { code: '001', name: '西芹' },
          { code: '002', name: '本芹' },
          { code: '003', name: '香芹' },
          { code: '004', name: '水芹菜' },
          { code: '099', name: '其他芹菜' },
        ],
      },
      {
        code: '12',
        name: '莴笋',
        subVarieties: [
          { code: '001', name: '青莴笋' },
          { code: '002', name: '红莴笋' },
          { code: '003', name: '飞桥莴笋' },
          { code: '004', name: '紫叶莴笋' },
          { code: '099', name: '其他莴笋' },
        ],
      },
      { code: '99', name: '其他叶菜' },
    ],
  },
  {
    code: '02',
    name: '瓜菜类',
    subCategories: [
      {
        code: '01',
        name: '黄瓜',
        subVarieties: [
          { code: '001', name: '水果黄瓜' },
          { code: '002', name: '刺黄瓜' },
          { code: '003', name: '无刺黄瓜' },
          { code: '004', name: '旱黄瓜' },
          { code: '005', name: '白黄瓜' },
          { code: '099', name: '其他黄瓜' },
        ],
      },
      { code: '02', name: '丝瓜' },
      { code: '03', name: '苦瓜' },
      { code: '04', name: '冬瓜' },
      { code: '05', name: '南瓜' },
      { code: '06', name: '瓠瓜' },
      { code: '07', name: '西葫芦' },
      { code: '99', name: '其他瓜菜' },
    ],
  },
  {
    code: '03',
    name: '茄果类',
    subCategories: [
      {
        code: '01',
        name: '番茄',
        subVarieties: [
          { code: '001', name: '樱桃番茄' },
          { code: '002', name: '硬粉番茄' },
          { code: '003', name: '水果番茄' },
          { code: '004', name: '红果番茄' },
          { code: '005', name: '黄果番茄' },
          { code: '099', name: '其他番茄' },
        ],
      },
      { code: '02', name: '小番茄' },
      { code: '03', name: '茄子' },
      {
        code: '04',
        name: '辣椒',
        subVarieties: [
          { code: '001', name: '朝天椒' },
          { code: '002', name: '线椒' },
          { code: '003', name: '灯笼椒' },
          { code: '004', name: '螺丝椒' },
          { code: '005', name: '小米椒' },
          { code: '099', name: '其他辣椒' },
        ],
      },
      { code: '05', name: '螺丝椒' },
      { code: '06', name: '彩椒' },
      { code: '07', name: '朝天椒' },
      { code: '99', name: '其他茄果' },
    ],
  },
  {
    code: '04',
    name: '根茎类',
    subCategories: [
      {
        code: '01',
        name: '萝卜',
        subVarieties: [
          { code: '001', name: '白萝卜' },
          { code: '002', name: '红萝卜' },
          { code: '003', name: '青萝卜' },
          { code: '004', name: '心里美' },
          { code: '005', name: '樱桃萝卜' },
          { code: '099', name: '其他萝卜' },
        ],
      },
      { code: '02', name: '胡萝卜' },
      { code: '03', name: '土豆' },
      { code: '04', name: '红薯' },
      { code: '05', name: '山药' },
      { code: '06', name: '莲藕' },
      { code: '07', name: '荸荠' },
      { code: '08', name: '芋头' },
      { code: '99', name: '其他根茎' },
    ],
  },
  {
    code: '05',
    name: '豆类',
    subCategories: [
      {
        code: '01',
        name: '豇豆',
        subVarieties: [
          { code: '001', name: '长豇豆' },
          { code: '002', name: '短豇豆' },
          { code: '003', name: '白豇豆' },
          { code: '004', name: '青豇豆' },
          { code: '099', name: '其他豇豆' },
        ],
      },
      {
        code: '02',
        name: '四季豆',
        subVarieties: [
          { code: '001', name: '架四季豆' },
          { code: '002', name: '矮四季豆' },
          { code: '003', name: '白四季豆' },
          { code: '004', name: '青四季豆' },
          { code: '099', name: '其他四季豆' },
        ],
      },
      {
        code: '03',
        name: '毛豆',
        subVarieties: [
          { code: '001', name: '大粒毛豆' },
          { code: '002', name: '小粒毛豆' },
          { code: '003', name: '青毛豆' },
          { code: '004', name: '黄毛豆' },
          { code: '099', name: '其他毛豆' },
        ],
      },
      { code: '04', name: '蚕豆' },
      {
        code: '05',
        name: '豌豆',
        subVarieties: [
          { code: '001', name: '甜豌豆' },
          { code: '002', name: '荷兰豆' },
          { code: '003', name: '麻豌豆' },
          { code: '099', name: '其他豌豆' },
        ],
      },
      { code: '06', name: '扁豆' },
      { code: '99', name: '其他豆类' },
    ],
  },
  {
    code: '06',
    name: '葱蒜类',
    subCategories: [
      {
        code: '01',
        name: '大葱',
        subVarieties: [
          { code: '001', name: '章丘大葱' },
          { code: '002', name: '铁杆大葱' },
          { code: '003', name: '长白葱' },
          { code: '004', name: '短白葱' },
          { code: '099', name: '其他大葱' },
        ],
      },
      {
        code: '02',
        name: '小葱',
        subVarieties: [
          { code: '001', name: '细香葱' },
          { code: '002', name: '分葱' },
          { code: '003', name: '楼葱' },
          { code: '099', name: '其他小葱' },
        ],
      },
      {
        code: '03',
        name: '洋葱',
        subVarieties: [
          { code: '001', name: '黄皮洋葱' },
          { code: '002', name: '紫皮洋葱' },
          { code: '003', name: '白皮洋葱' },
          { code: '004', name: '红皮洋葱' },
          { code: '099', name: '其他洋葱' },
        ],
      },
      {
        code: '04',
        name: '大蒜',
        subVarieties: [
          { code: '001', name: '紫皮蒜' },
          { code: '002', name: '白皮蒜' },
          { code: '003', name: '独头蒜' },
          { code: '004', name: '多瓣蒜' },
          { code: '099', name: '其他大蒜' },
        ],
      },
      {
        code: '05',
        name: '生姜',
        subVarieties: [
          { code: '001', name: '老姜' },
          { code: '002', name: '嫩姜' },
          { code: '003', name: '沙姜' },
          { code: '004', name: '山姜' },
          { code: '099', name: '其他生姜' },
        ],
      },
      { code: '06', name: '韭菜花' },
      { code: '99', name: '其他葱蒜' },
    ],
  },
];

// 水果类（FR）类型配置
const produceTypesFR: ProduceType[] = [
  {
    code: '01',
    name: '浆果类',
    subCategories: [
      {
        code: '01',
        name: '草莓',
        subVarieties: [
          // 子品种1使用3位码，如001红颜、002章姬
          // 子品种2（详细名称如"大叶红颜"）由用户在录入时手工输入
          { code: '001', name: '红颜' },
          { code: '002', name: '章姬' },
          { code: '003', name: '宁玉' },
          { code: '004', name: '甜查理' },
          { code: '005', name: '淡雪' },
          { code: '006', name: '桃熏' },
          { code: '099', name: '其他草莓' },
        ],
      },
      {
        code: '02',
        name: '蓝莓',
        subVarieties: [
          { code: '001', name: '北高丛' },
          { code: '002', name: '南高丛' },
          { code: '003', name: '兔眼' },
          { code: '004', name: '半高丛' },
          { code: '005', name: '矮丛' },
          { code: '099', name: '其他蓝莓' },
        ],
      },
      {
        code: '03',
        name: '树莓',
        subVarieties: [
          { code: '001', name: '红树莓' },
          { code: '002', name: '黑树莓' },
          { code: '003', name: '黄树莓' },
          { code: '004', name: '紫树莓' },
          { code: '099', name: '其他树莓' },
        ],
      },
      {
        code: '04',
        name: '葡萄',
        subVarieties: [
          { code: '001', name: '巨峰' },
          { code: '002', name: '夏黑' },
          { code: '003', name: '阳光玫瑰' },
          { code: '004', name: '红提' },
          { code: '005', name: '青提' },
          { code: '006', name: '美人指' },
          { code: '099', name: '其他葡萄' },
        ],
      },
      { code: '05', name: '猕猴桃' },
      { code: '06', name: '火龙果' },
      { code: '99', name: '其他浆果' },
    ],
  },
  {
    code: '02',
    name: '核果类',
    subCategories: [
      {
        code: '01',
        name: '桃子',
        subVarieties: [
          { code: '001', name: '水蜜桃' },
          { code: '002', name: '黄桃' },
          { code: '003', name: '油桃' },
          { code: '004', name: '蟠桃' },
          { code: '005', name: '血桃' },
          { code: '006', name: '毛桃' },
          { code: '099', name: '其他桃子' },
        ],
      },
      {
        code: '02',
        name: '李子',
        subVarieties: [
          { code: '001', name: '红李' },
          { code: '002', name: '青李' },
          { code: '003', name: '黑李' },
          { code: '004', name: '黄李' },
          { code: '005', name: '脆李' },
          { code: '099', name: '其他李子' },
        ],
      },
      {
        code: '03',
        name: '杏子',
        subVarieties: [
          { code: '001', name: '甜杏' },
          { code: '002', name: '酸杏' },
          { code: '003', name: '仁用杏' },
          { code: '004', name: '红杏' },
          { code: '005', name: '白杏' },
          { code: '099', name: '其他杏子' },
        ],
      },
      {
        code: '04',
        name: '梅子',
        subVarieties: [
          { code: '001', name: '青梅' },
          { code: '002', name: '黄梅' },
          { code: '003', name: '红梅' },
          { code: '004', name: '乌梅' },
          { code: '099', name: '其他梅子' },
        ],
      },
      {
        code: '05',
        name: '樱桃',
        subVarieties: [
          { code: '001', name: '红灯樱桃' },
          { code: '002', name: '美早樱桃' },
          { code: '003', name: '黄蜜樱桃' },
          { code: '004', name: '黑珍珠樱桃' },
          { code: '005', name: '萨米托樱桃' },
          { code: '006', name: '布鲁克斯樱桃' },
          { code: '099', name: '其他樱桃' },
        ],
      },
      { code: '99', name: '其他核果' },
    ],
  },
  {
    code: '03',
    name: '仁果类',
    subCategories: [
      {
        code: '01',
        name: '苹果',
        subVarieties: [
          { code: '001', name: '红富士' },
          { code: '002', name: '嘎啦' },
          { code: '003', name: '黄元帅' },
          { code: '004', name: '青苹果' },
          { code: '005', name: '蛇果' },
          { code: '006', name: '花牛' },
          { code: '099', name: '其他苹果' },
        ],
      },
      {
        code: '02',
        name: '梨',
        subVarieties: [
          { code: '001', name: '雪梨' },
          { code: '002', name: '鸭梨' },
          { code: '003', name: '皇冠梨' },
          { code: '004', name: '酥梨' },
          { code: '005', name: '香梨' },
          { code: '099', name: '其他梨' },
        ],
      },
      { code: '03', name: '山楂' },
      { code: '04', name: '枇杷' },
      { code: '99', name: '其他仁果' },
    ],
  },
  {
    code: '04',
    name: '柑橘类',
    subCategories: [
      {
        code: '01',
        name: '橙子',
        subVarieties: [
          { code: '001', name: '脐橙' },
          { code: '002', name: '血橙' },
          { code: '003', name: '冰糖橙' },
          { code: '004', name: '夏橙' },
          { code: '005', name: '甜橙' },
          { code: '099', name: '其他橙子' },
        ],
      },
      {
        code: '02',
        name: '柑橘',
        subVarieties: [
          { code: '001', name: '砂糖橘' },
          { code: '002', name: '蜜橘' },
          { code: '003', name: '贡橘' },
          { code: '004', name: '丑橘' },
          { code: '005', name: '沃柑' },
          { code: '099', name: '其他柑橘' },
        ],
      },
      {
        code: '03',
        name: '柚子',
        subVarieties: [
          { code: '001', name: '沙田柚' },
          { code: '002', name: '蜜柚' },
          { code: '003', name: '文旦' },
          { code: '004', name: '西柚' },
          { code: '005', name: '胡柚' },
          { code: '099', name: '其他柚子' },
        ],
      },
      { code: '04', name: '柠檬' },
      { code: '05', name: '金橘' },
      { code: '99', name: '其他柑橘' },
    ],
  },
  {
    code: '05',
    name: '热带水果',
    subCategories: [
      {
        code: '01',
        name: '香蕉',
        subVarieties: [
          { code: '001', name: '黄香蕉' },
          { code: '002', name: '青香蕉' },
          { code: '003', name: '红香蕉' },
          { code: '004', name: '小米蕉' },
          { code: '005', name: '皇帝蕉' },
          { code: '099', name: '其他香蕉' },
        ],
      },
      {
        code: '02',
        name: '菠萝',
        subVarieties: [
          { code: '001', name: '香水菠萝' },
          { code: '002', name: '金钻菠萝' },
          { code: '003', name: '牛奶菠萝' },
          { code: '004', name: '手撕菠萝' },
          { code: '005', name: '无眼菠萝' },
          { code: '099', name: '其他菠萝' },
        ],
      },
      {
        code: '03',
        name: '芒果',
        subVarieties: [
          { code: '001', name: '台农芒果' },
          { code: '002', name: '贵妃芒果' },
          { code: '003', name: '金煌芒果' },
          { code: '004', name: '象牙芒果' },
          { code: '005', name: '青芒果' },
          { code: '006', name: '凯特芒果' },
          { code: '099', name: '其他芒果' },
        ],
      },
      { code: '04', name: '椰子' },
      {
        code: '05',
        name: '荔枝',
        subVarieties: [
          { code: '001', name: '妃子笑' },
          { code: '002', name: '糯米糍' },
          { code: '003', name: '桂味' },
          { code: '004', name: '荔枝王' },
          { code: '005', name: '白蜡荔枝' },
          { code: '099', name: '其他荔枝' },
        ],
      },
      {
        code: '06',
        name: '龙眼',
        subVarieties: [
          { code: '001', name: '石硖龙眼' },
          { code: '002', name: '储良龙眼' },
          { code: '003', name: '古山龙眼' },
          { code: '004', name: '草铺龙眼' },
          { code: '005', name: '东壁龙眼' },
          { code: '099', name: '其他龙眼' },
        ],
      },
      { code: '07', name: '榴莲' },
      { code: '08', name: '菠萝蜜' },
      { code: '99', name: '其他热带水果' },
    ],
  },
  {
    code: '06',
    name: '瓜类水果',
    subCategories: [
      {
        code: '01',
        name: '西瓜',
        subVarieties: [
          { code: '001', name: '黑美人' },
          { code: '002', name: '麒麟瓜' },
          { code: '003', name: '8424西瓜' },
          { code: '004', name: '京欣西瓜' },
          { code: '005', name: '特小凤' },
          { code: '006', name: '早春红玉' },
          { code: '099', name: '其他西瓜' },
        ],
      },
      {
        code: '02',
        name: '哈密瓜',
        subVarieties: [
          { code: '001', name: '西州蜜' },
          { code: '002', name: '黄醉仙' },
          { code: '003', name: '红心脆' },
          { code: '004', name: '黑眉毛' },
          { code: '005', name: '伽师瓜' },
          { code: '099', name: '其他哈密瓜' },
        ],
      },
      {
        code: '03',
        name: '甜瓜',
        subVarieties: [
          { code: '001', name: '羊角蜜' },
          { code: '002', name: '博洋甜瓜' },
          { code: '003', name: '绿宝甜瓜' },
          { code: '004', name: '金如意甜瓜' },
          { code: '005', name: '伊丽莎白甜瓜' },
          { code: '099', name: '其他甜瓜' },
        ],
      },
      {
        code: '04',
        name: '木瓜',
        subVarieties: [
          { code: '001', name: '番木瓜' },
          { code: '002', name: '宣木瓜' },
          { code: '003', name: '毛叶木瓜' },
          { code: '004', name: '皱皮木瓜' },
          { code: '005', name: '光皮木瓜' },
          { code: '099', name: '其他木瓜' },
        ],
      },
      { code: '99', name: '其他瓜类水果' },
    ],
  },
];

// 粮食类（GR）类型配置
const produceTypesGR: ProduceType[] = [
  {
    code: '01',
    name: '稻谷类',
    subCategories: [
      { code: '01', name: '水稻' },
      { code: '02', name: '糯米' },
      { code: '03', name: '粳米' },
      { code: '04', name: '籼米' },
      { code: '99', name: '其他稻谷' },
    ],
  },
  {
    code: '02',
    name: '小麦类',
    subCategories: [
      { code: '01', name: '小麦' },
      { code: '02', name: '大麦' },
      { code: '03', name: '荞麦' },
      { code: '99', name: '其他小麦类' },
    ],
  },
  {
    code: '03',
    name: '玉米类',
    subCategories: [
      { code: '01', name: '玉米' },
      { code: '02', name: '糯玉米' },
      { code: '03', name: '甜玉米' },
      { code: '04', name: '爆裂玉米' },
      { code: '99', name: '其他玉米' },
    ],
  },
  {
    code: '04',
    name: '豆类粮食',
    subCategories: [
      { code: '01', name: '黄豆' },
      { code: '02', name: '黑豆' },
      { code: '03', name: '绿豆' },
      { code: '04', name: '红豆' },
      { code: '05', name: '芸豆' },
      { code: '06', name: '蚕豆' },
      { code: '99', name: '其他豆类' },
    ],
  },
  {
    code: '05',
    name: '薯类粮食',
    subCategories: [
      { code: '01', name: '红薯' },
      { code: '02', name: '土豆' },
      { code: '03', name: '芋头' },
      { code: '04', name: '山药' },
      { code: '99', name: '其他薯类' },
    ],
  },
];

// 花卉类（FL）类型配置
const produceTypesFL: ProduceType[] = [
  {
    code: '01',
    name: '鲜切花',
    subCategories: [
      { code: '01', name: '玫瑰' },
      { code: '02', name: '百合' },
      { code: '03', name: '康乃馨' },
      { code: '04', name: '郁金香' },
      { code: '05', name: '菊花' },
      { code: '06', name: '洋桔梗' },
      { code: '07', name: '非洲菊' },
      { code: '08', name: '满天星' },
      { code: '09', name: '勿忘我' },
      { code: '10', name: '情人草' },
      { code: '99', name: '其他鲜切花' },
    ],
  },
  {
    code: '02',
    name: '盆栽花卉',
    subCategories: [
      { code: '01', name: '绿萝' },
      { code: '02', name: '吊兰' },
      { code: '03', name: '多肉植物' },
      { code: '04', name: '仙人掌' },
      { code: '05', name: '君子兰' },
      { code: '06', name: '兰花' },
      { code: '07', name: '杜鹃花' },
      { code: '08', name: '茉莉花' },
      { code: '99', name: '其他盆栽' },
    ],
  },
  {
    code: '03',
    name: '观赏植物',
    subCategories: [
      { code: '01', name: '发财树' },
      { code: '02', name: '幸福树' },
      { code: '03', name: '平安树' },
      { code: '04', name: '散尾葵' },
      { code: '05', name: '龟背竹' },
      { code: '06', name: '橡皮树' },
      { code: '99', name: '其他观赏植物' },
    ],
  },
];

// 药材类（HB）类型配置
const produceTypesHB: ProduceType[] = [
  {
    code: '01',
    name: '根茎类药材',
    subCategories: [
      { code: '01', name: '人参' },
      { code: '02', name: '党参' },
      { code: '03', name: '黄芪' },
      { code: '04', name: '当归' },
      { code: '05', name: '枸杞' },
      { code: '06', name: '天麻' },
      { code: '07', name: '三七' },
      { code: '08', name: '何首乌' },
      { code: '99', name: '其他根茎药材' },
    ],
  },
  {
    code: '02',
    name: '花叶类药材',
    subCategories: [
      { code: '01', name: '金银花' },
      { code: '02', name: '菊花' },
      { code: '03', name: '玫瑰花' },
      { code: '04', name: '茉莉花' },
      { code: '05', name: '荷叶' },
      { code: '06', name: '艾叶' },
      { code: '99', name: '其他花叶药材' },
    ],
  },
  {
    code: '03',
    name: '果实类药材',
    subCategories: [
      { code: '01', name: '山楂' },
      { code: '02', name: '枇杷叶' },
      { code: '03', name: '陈皮' },
      { code: '04', name: '橘红' },
      { code: '05', name: '罗汉果' },
      { code: '99', name: '其他果实药材' },
    ],
  },
];

// 食用菌类（MG）类型配置
const produceTypesMG: ProduceType[] = [
  {
    code: '01',
    name: '木腐菌',
    subCategories: [
      { code: '01', name: '香菇' },
      { code: '02', name: '金针菇' },
      { code: '03', name: '平菇' },
      { code: '04', name: '杏鲍菇' },
      { code: '05', name: '白玉菇' },
      { code: '06', name: '蟹味菇' },
      { code: '99', name: '其他木腐菌' },
    ],
  },
  {
    code: '02',
    name: '草腐菌',
    subCategories: [
      { code: '01', name: '双孢蘑菇' },
      { code: '02', name: '草菇' },
      { code: '03', name: '鸡腿菇' },
      { code: '04', name: '姬松茸' },
      { code: '99', name: '其他草腐菌' },
    ],
  },
  {
    code: '03',
    name: '野生菌',
    subCategories: [
      { code: '01', name: '松茸' },
      { code: '02', name: '牛肝菌' },
      { code: '03', name: '鸡枞菌' },
      { code: '04', name: '羊肚菌' },
      { code: '05', name: '竹荪' },
      { code: '06', name: '黑木耳' },
      { code: '07', name: '银耳' },
      { code: '99', name: '其他野生菌' },
    ],
  },
];

// 其他类（OT）类型配置
const produceTypesOT: ProduceType[] = [
  {
    code: '01',
    name: '坚果类',
    subCategories: [
      { code: '01', name: '核桃' },
      { code: '02', name: '板栗' },
      { code: '03', name: '腰果' },
      { code: '04', name: '杏仁' },
      { code: '05', name: '榛子' },
      { code: '99', name: '其他坚果' },
    ],
  },
  {
    code: '02',
    name: '茶叶类',
    subCategories: [
      { code: '01', name: '绿茶' },
      { code: '02', name: '红茶' },
      { code: '03', name: '乌龙茶' },
      { code: '04', name: '普洱茶' },
      { code: '05', name: '茉莉花茶' },
      { code: '99', name: '其他茶叶' },
    ],
  },
  {
    code: '03',
    name: '调料类',
    subCategories: [
      { code: '01', name: '花椒' },
      { code: '02', name: '八角' },
      { code: '03', name: '桂皮' },
      { code: '04', name: '胡椒' },
      { code: '05', name: '辣椒干' },
      { code: '99', name: '其他调料' },
    ],
  },
  {
    code: '99',
    name: '其他农产品',
    subCategories: [
      { code: '01', name: '蜂蜜' },
      { code: '02', name: '花粉' },
      { code: '03', name: '蜂王浆' },
      { code: '99', name: '其他' },
    ],
  },
];

// ============================================
// 农产品大类配置（包含完整层级结构）
// ============================================
export const produceCategories: ProduceCategory[] = [
  {
    code: 'PD',
    name: '蔬菜类',
    nameEn: 'Vegetables',
    description: '新鲜蔬菜产品',
    types: produceTypesPD,
  },
  {
    code: 'FR',
    name: '水果类',
    nameEn: 'Fruits',
    description: '各类水果产品',
    types: produceTypesFR,
  },
  {
    code: 'GR',
    name: '粮食类',
    nameEn: 'Grains & Cereals',
    description: '粮食作物及加工品',
    types: produceTypesGR,
  },
  {
    code: 'FL',
    name: '花卉类',
    nameEn: 'Flowers & Plants',
    description: '花卉及观赏植物',
    types: produceTypesFL,
  },
  {
    code: 'HB',
    name: '药材类',
    nameEn: 'Herbs & Medicine',
    description: '中药材和药用植物',
    types: produceTypesHB,
  },
  {
    code: 'MG',
    name: '食用菌类',
    nameEn: 'Mushrooms',
    description: '食用菌及菌菇类产品',
    types: produceTypesMG,
  },
  {
    code: 'OT',
    name: '其他类',
    nameEn: 'Others',
    description: '其他农产品',
    types: produceTypesOT,
  },
];

// ============================================
// 辅助函数
// ============================================

// 根据大类获取类型配置
export const getProduceTypesByCategory = (categoryCode: ProduceCategoryCode): ProduceType[] => {
  switch (categoryCode) {
    case 'PD':
      return produceTypesPD;
    case 'FR':
      return produceTypesFR;
    case 'GR':
      return produceTypesGR;
    case 'FL':
      return produceTypesFL;
    case 'HB':
      return produceTypesHB;
    case 'MG':
      return produceTypesMG;
    case 'OT':
      return produceTypesOT;
    default:
      return [];
  }
};

// 生成产品编码
let produceSerialCounters: Record<string, number> = {};

// 初始化计数器（从已有最大序号开始）
export const initProduceSerialCounter = (categoryCode: string, typeCode: string, varietyCode: string, currentMax: number = 0) => {
  const key = `${categoryCode}${typeCode}${varietyCode}`;
  produceSerialCounters[key] = currentMax;
};

// 获取下一个产品编码
export const generateProduceCode = (categoryCode: ProduceCategoryCode, typeCode: string, varietyCode: string): string => {
  const key = `${categoryCode}${typeCode}${varietyCode}`;
  if (!produceSerialCounters[key]) {
    produceSerialCounters[key] = 0;
  }
  produceSerialCounters[key]++;
  const serial = produceSerialCounters[key].toString().padStart(3, '0');
  return `${categoryCode}${typeCode}${varietyCode}${serial}`;
};

// 根据编码获取分类信息
export const getProduceCategoryInfo = (code: string): { category: ProduceCategory; type: ProduceType; variety: ProduceSubType } | null => {
  // 编码结构：大类(2位) + 类型(2位) + 品种(2位) + 子品种1(3位) + 详细品种(2位) = 11位
  // 前6位是分类信息
  if (code.length < 6) return null;

  const categoryCode = code.substring(0, 2) as ProduceCategoryCode;
  const typeCode = code.substring(2, 4);
  const varietyCode = code.substring(4, 6);

  const category = produceCategories.find(c => c.code === categoryCode);
  if (!category) return null;

  const types = getProduceTypesByCategory(categoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return null;

  const variety = type.subCategories.find(v => v.code === varietyCode);
  if (!variety) return null;

  return { category, type, variety };
};

// 根据作物名称查找对应的编码信息
export interface ProduceCodeInfo {
  categoryCode: ProduceCategoryCode;
  typeCode: string;
  subCode: string;
  categoryName: string;
  typeName: string;
  subName: string;
}

// 缓存作物名称到编码信息的映射
let cropNameToCodeCache: Map<string, ProduceCodeInfo> | null = null;

// 递归构建名称缓存（支持多级子品种）
const buildCropNameCacheRecursive = (
  categoryCode: string,
  categoryName: string,
  typeCode: string,
  typeName: string,
  varietyCode: string,
  varietyName: string,
  sub?: ProduceSubType,
  level: number = 1
): Map<string, ProduceCodeInfo> => {
  const cache = new Map<string, ProduceCodeInfo>();

  // 当前级别的品种
  const key = sub ? sub.name.trim() : varietyName.trim();
  const codeInfo: ProduceCodeInfo = {
    categoryCode,
    typeCode,
    subCode: sub ? sub.code : varietyCode,
    categoryName,
    typeName,
    subName: sub ? sub.name : varietyName,
    // 多级品种信息
    level,
    parentVarietyCode: sub ? varietyCode : undefined,
    parentVarietyName: sub ? varietyName : undefined,
  };
  cache.set(key, codeInfo);

  // 递归处理子品种
  if (sub?.subVarieties) {
    for (const childSub of sub.subVarieties) {
      const childCache = buildCropNameCacheRecursive(
        categoryCode,
        categoryName,
        typeCode,
        typeName,
        sub.code,
        sub.name,
        childSub,
        level + 1
      );
      // 合并到父缓存
      childCache.forEach((value, key) => cache.set(key, value));
    }
  }

  return cache;
};

const buildCropNameCache = (): Map<string, ProduceCodeInfo> => {
  if (cropNameToCodeCache) return cropNameToCodeCache;

  cropNameToCodeCache = new Map();
  for (const category of produceCategories) {
    const types = getProduceTypesByCategory(category.code);
    for (const type of types) {
      for (const sub of type.subCategories) {
        // 使用作物品种名称作为key（去除空格）
        // 检查是否有子品种
        if (sub.subVarieties && sub.subVarieties.length > 0) {
          // 有子品种，递归处理
          for (const childSub of sub.subVarieties) {
            const childCache = buildCropNameCacheRecursive(
              category.code,
              category.name,
              type.code,
              type.name,
              sub.code,
              sub.name,
              childSub,
              2
            );
            childCache.forEach((value, key) => cropNameToCodeCache!.set(key, value));
          }
        } else {
          // 无子品种，直接添加
          const normalizedName = sub.name.trim();
          cropNameToCodeCache!.set(normalizedName, {
            categoryCode: category.code,
            typeCode: type.code,
            subCode: sub.code,
            categoryName: category.name,
            typeName: type.name,
            subName: sub.name,
            level: 1,
          });
        }
      }
    }
  }
  return cropNameToCodeCache;
};

// 根据作物品种名称查找编码信息（如"菠菜" -> PD01）
export const findProduceCodeByName = (cropName: string): ProduceCodeInfo | null => {
  if (!cropName) return null;
  const cache = buildCropNameCache();
  return cache.get(cropName.trim()) || null;
};

// 获取所有作物品种名称列表（用于下拉选择）
export const getAllCropNames = (): string[] => {
  const cache = buildCropNameCache();
  return Array.from(cache.keys()).sort();
};

/**
 * 根据父品种路径获取子品种选项（用于UI多级下拉）
 * @param categoryCode 类别代码
 * @param typeCode 类型代码
 * @param varietyCode 主品种代码
 * @param parentSubCode 父级子品种代码（可选，用于获取更细分类）
 */
export const getSubVarietyOptions = (
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  parentSubCode?: string
): Array<{ value: string; label: string; hasChildren: boolean }> => {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return [];

  const variety = type.subCategories.find(v => v.code === varietyCode);
  if (!variety) return [];

  // 如果有parentSubCode，继续往下找
  if (parentSubCode && variety.subVarieties) {
    const parent = variety.subVarieties.find(s => s.code === parentSubCode);
    if (parent?.subVarieties) {
      return parent.subVarieties.map(s => ({
        value: s.code,
        label: s.name,
        hasChildren: !!s.subVarieties && s.subVarieties.length > 0,
      }));
    }
  }

  // 返回主品种下的直接子品种列表
  if (variety.subVarieties) {
    return variety.subVarieties.map(s => ({
      value: s.code,
      label: s.name,
      hasChildren: !!s.subVarieties && s.subVarieties.length > 0,
    }));
  }

  return [];
};

/**
 * 获取品种的完整路径信息
 */
export const getVarietyPath = (
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subCode?: string,
  subSubCode?: string
): {
  categoryName: string;
  typeName: string;
  varietyName: string;
  subVarietyName?: string;
  subSubVarietyName?: string;
} | null => {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return null;

  const variety = type.subCategories.find(v => v.code === varietyCode);
  if (!variety) return null;

  const result = {
    categoryName: produceCategories.find(c => c.code === categoryCode)?.name || '',
    typeName: type.name,
    varietyName: variety.name,
  };

  // 如果有子品种代码，继续查找
  if (subCode && variety.subVarieties) {
    const subVariety = variety.subVarieties.find(s => s.code === subCode);
    if (subVariety) {
      result.subVarietyName = subVariety.name;
      // 如果还有更细的分类
      if (subSubCode && subVariety.subVarieties) {
        const subSubVariety = subVariety.subVarieties.find(s => s.code === subSubCode);
        if (subSubVariety) {
          result.subSubVarietyName = subSubVariety.name;
        }
      }
    }
  }

  return result;
};
