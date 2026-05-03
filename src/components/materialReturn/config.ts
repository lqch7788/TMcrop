// 编码规则配置：大类(2位字母) + 中类(2位数字) + 小类(2位数字) + 顺序号(3位数字)
export const categoryConfig = {
  // 大类：SP = 生产投入类
  'SP': { name: '生产投入类', categories: {
    '01': { name: '种质资源', subCategories: {
      '01': { name: '粮食作物种子' },
      '02': { name: '经济作物种子' },
      '03': { name: '蔬菜种子' },
      '04': { name: '蔬菜种苗' },
      '05': { name: '水果苗木种苗' },
      '06': { name: '水果苗木种子' },
      '07': { name: '花卉与观赏植物' },
      '08': { name: '食用菌菌种' },
      '99': { name: '其他种质资源' },
    }},
    '02': { name: '肥料与土壤改良剂', subCategories: {
      '01': { name: '有机肥' },
      '02': { name: '化学肥料' },
      '03': { name: '水溶肥' },
      '04': { name: '叶面肥' },
      '05': { name: '微生物菌剂' },
      '06': { name: '土壤调理剂' },
      '07': { name: '育苗基质' },
      '99': { name: '其他类型' },
    }},
    '03': { name: '农药与植保产品', subCategories: {
      '01': { name: '杀虫剂' },
      '02': { name: '杀菌剂' },
      '03': { name: '杀螨剂' },
      '04': { name: '除草剂' },
      '05': { name: '植物生长调节剂' },
      '06': { name: '物理防控用品' },
      '07': { name: '生物农药' },
      '99': { name: '其他类型' },
    }},
  }},
  // 大类：EQ = 设施与装备类
  'EQ': { name: '设施与装备类', categories: {
    '01': { name: '农业机械', subCategories: {
      '01': { name: '耕作机械' },
      '02': { name: '播种/移栽设备' },
      '03': { name: '植保机械' },
      '04': { name: '收获机械' },
      '05': { name: '初加工设备' },
      '99': { name: '其他相关机械' },
    }},
    '02': { name: '设施农业系统', subCategories: {
      '01': { name: '骨架结构材料' },
      '02': { name: '覆盖材料' },
      '03': { name: '通风降温设备' },
      '04': { name: '加温设备' },
      '05': { name: '补光系统' },
      '06': { name: '自动化控制设备' },
      '99': { name: '其他相关设施设备' },
    }},
    '03': { name: '灌溉与水肥系统', subCategories: {
      '01': { name: '水源与泵站' },
      '02': { name: '水肥一体机' },
      '03': { name: '输水管网' },
      '04': { name: '过滤系统' },
      '05': { name: '施肥装置' },
      '06': { name: '灌溉终端' },
      '99': { name: '其他相关灌溉系统设备' },
    }},
  }},
  // 大类：OP = 作业支持类
  'OP': { name: '作业支持类', categories: {
    '01': { name: '劳保与防护用品', subCategories: {
      '01': { name: '手部防护' },
      '02': { name: '足部防护' },
      '03': { name: '身体防护' },
      '04': { name: '呼吸/眼部防护' },
      '05': { name: '防晒防暑用品' },
      '99': { name: '其他劳保防护类' },
    }},
    '02': { name: '日常劳动工具', subCategories: {
      '01': { name: '手动农具' },
      '02': { name: '修剪工具' },
      '03': { name: '小型电动工具' },
      '04': { name: '清洁工具' },
      '05': { name: '小型运输车' },
      '99': { name: '其他劳动工具' },
    }},
    '03': { name: '标识与记录用品', subCategories: {
      '01': { name: '田间标牌/标签' },
      '02': { name: '记录本、记号笔' },
      '03': { name: '二维码/RFID标签' },
      '99': { name: '其他标识记录用品' },
    }},
  }},
  // 大类：PH = 采后处理与流通类
  'PH': { name: '采后处理与流通类', categories: {
    '01': { name: '采收容器', subCategories: {
      '01': { name: '塑料周转箱' },
      '02': { name: '采摘篮/筐' },
      '03': { name: '吨袋/编织袋' },
      '04': { name: '包装材料' },
      '05': { name: '纸箱' },
      '06': { name: '泡沫网套/隔板' },
      '07': { name: '胶带、封口耗材' },
      '08': { name: '商品标签/追溯标签' },
      '99': { name: '其他采收材料' },
    }},
    '02': { name: '冷链与仓储设备', subCategories: {
      '01': { name: '预冷库/冷藏库' },
      '02': { name: '冷藏运输设备' },
      '03': { name: '保温箱、冰袋' },
      '99': { name: '其他' },
    }},
  }},
  // 大类：IT = 数字化与管理类
  'IT': { name: '数字化与管理类', categories: {
    '01': { name: '监测设备', subCategories: {
      '01': { name: '空气/土壤/光照等传感器' },
      '02': { name: '手持检测类设备' },
      '03': { name: '气象站' },
      '04': { name: '虫情测报灯' },
      '05': { name: '视频监控设备' },
      '99': { name: '其他检测相关设备' },
    }},
    '02': { name: '控制设备', subCategories: {
      '01': { name: '环境参数感知设备' },
      '02': { name: '执行控制设备' },
      '03': { name: '人机交互与本地操作设备' },
      '04': { name: '通信与联网设备' },
      '05': { name: '电源与辅助控制设备' },
      '99': { name: '其他相关控制设备' },
    }},
  }},
  // 大类：EC = 能源与通用耗材
  'EC': { name: '能源与通用耗材', categories: {
    '01': { name: '能源类', subCategories: {
      '01': { name: '柴油/汽油' },
      '02': { name: '电力' },
      '03': { name: '太阳能板及配件' },
      '99': { name: '其他能源类' },
    }},
    '02': { name: '通用耗材', subCategories: {
      '01': { name: '润滑油脂' },
      '02': { name: '清洁剂' },
      '99': { name: '其他通用耗材' },
    }},
  }},
};

// 根据物料编码获取物料分类名称
export const getCategoryByCode = (code: string): string => {
  if (!code || code.length < 6) return '未知分类';
  const type = code.substring(0, 2);
  const category = code.substring(2, 4);
  const subCategory = code.substring(4, 6);

  const typeConfig = categoryConfig[type as keyof typeof categoryConfig];
  if (!typeConfig) return '未知分类';

  const categoryInfo = typeConfig.categories[category as keyof typeof typeConfig.categories];
  if (!categoryInfo) return '未知分类';

  const subCategoryInfo = categoryInfo.subCategories[subCategory as keyof typeof categoryInfo.subCategories];
  if (!subCategoryInfo) return '未知分类';

  return subCategoryInfo.name;
};

// 注意：部门选项现在通过 useDepartmentOptions hook 从 API 获取
// 请在组件中使用: import { useDepartmentOptions } from '../../hooks/useDepartmentOptions';
// 然后: const { options } = useDepartmentOptions({ includeAll: true });

// 申请人选项
export const APPLICANTS = [
  '李建国',
  '王建华',
  '张建华',
  '赵技术',
  '陈技术',
  '周管理员',
  '吴主管',
] as const;

// 仓库位置选项
export const WAREHOUSE_LOCATIONS = [
  'A区-01',
  'A区-02',
  'A区-03',
  'A区-04',
  'B区-01',
  'B区-02',
  'B区-03',
  'C区-01',
  'C区-05',
] as const;

// 操作人选项
export const OPERATORS = [
  '郭靖',
  '杨过',
  '张无忌',
  '令狐冲',
  '段誉',
  '萧峰',
  '虚竹',
  '胡斐',
  '陈家洛',
  '袁承志',
] as const;

// 审核人选项
export const REVIEWERS = [
  '黄药师',
  '小龙女',
  '周芷若',
  '任盈盈',
  '霍青桐',
  '夏雪宜',
  '程灵素',
  '扫地僧',
  '丁典',
] as const;

// 退料类型选项
export const RETURN_TYPES = [
  '生产退料',
  '品质退料',
  '试制退料',
] as const;
