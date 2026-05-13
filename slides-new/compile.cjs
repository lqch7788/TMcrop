/**
 * compile.cjs - 编译所有幻灯片为完整PPT
 * 农业种植管理系统 V1.1 功能介绍
 */

const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

// 创建演示文稿
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title = '农业种植管理系统 V1.1 功能介绍';
pres.author = '技术支持团队';
pres.subject = '系统功能演示';

// 主题配色 - 绿色商务风格
const theme = {
  primary: "1B4332",    // 深绿色-标题/背景
  secondary: "2D6A4F",  // 中绿色-副标题
  accent: "40916C",     // 浅绿色-强调
  light: "95D5B2",      // 薄荷绿-装饰
  bg: "FFFFFF",          // 白色-背景
  text: "1B1B1B",       // 深灰-正文
  muted: "6C757D"       // 灰色-辅助文字
};

// 幻灯片顺序
const slideNumbers = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'
];

console.log('开始编译PPT...\n');

// 按顺序加载并创建幻灯片
for (const num of slideNumbers) {
  const filePath = path.join(__dirname, `slide-${num}.cjs`);

  if (fs.existsSync(filePath)) {
    try {
      const slideModule = require(filePath);
      slideModule.createSlide(pres, theme);
      console.log(`[OK] slide-${num}.cjs 已加载`);
    } catch (err) {
      console.error(`[FAIL] slide-${num}.cjs 加载失败:`, err.message);
    }
  } else {
    console.warn(`[SKIP] slide-${num}.cjs 不存在，跳过`);
  }
}

// 确保输出目录存在
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 输出PPT文件
const outputPath = path.join(outputDir, '农业种植管理系统V1.1功能介绍.pptx');
pres.writeFile({ fileName: outputPath })
  .then(() => {
    console.log(`\n[SUCCESS] PPT编译完成！`);
    console.log(`  输出路径: ${outputPath}`);
  })
  .catch(err => {
    console.error('\n[ERROR] PPT生成失败:', err);
  });
