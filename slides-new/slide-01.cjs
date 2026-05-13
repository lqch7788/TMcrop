/**
 * slide-01.cjs - 封面页
 * 农业种植管理系统 V1.1 功能介绍
 */

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

// 封面页幻灯片
function createSlide(pres, theme) {
  const slide = pres.addSlide();

  // 幻灯片尺寸: 10" x 5.625" (LAYOUT_16x9)
  const slideWidth = 10;
  const slideHeight = 5.625;

  // 左侧白色背景 (40%)
  slide.background = { color: theme.bg };

  // 右侧深绿色背景块 (60%)
  slide.addShape("rect", {
    x: 4,
    y: 0,
    w: 6,
    h: slideHeight,
    fill: { color: theme.primary }
  });

  // 右侧装饰 - 叠加的薄荷绿矩形
  slide.addShape("rect", {
    x: 8.5,
    y: 0,
    w: 1.5,
    h: 2.5,
    fill: { color: theme.light, transparency: 40 }
  });

  // 右侧装饰 - 中绿色矩形
  slide.addShape("rect", {
    x: 7.8,
    y: 3.5,
    w: 0.8,
    h: 2.125,
    fill: { color: theme.secondary, transparency: 50 }
  });

  // 右侧装饰 - 浅绿色圆形
  slide.addShape("ellipse", {
    x: 8.8,
    y: 4.2,
    w: 1.0,
    h: 1.0,
    fill: { color: theme.accent, transparency: 30 }
  });

  // 左侧主标题
  slide.addText("农业种植管理系统", {
    x: 0.5,
    y: 1.8,
    w: 3.3,
    h: 1.0,
    fontSize: 32,
    fontFace: "Microsoft YaHei",
    color: theme.primary,
    bold: true,
    align: "left"
  });

  // 左侧副标题
  slide.addText("V1.1 功能介绍", {
    x: 0.5,
    y: 2.8,
    w: 3.3,
    h: 0.6,
    fontSize: 20,
    fontFace: "Microsoft YaHei",
    color: theme.secondary,
    bold: true,
    align: "left"
  });

  // 左侧装饰线
  slide.addShape("rect", {
    x: 0.5,
    y: 3.5,
    w: 1.5,
    h: 0.05,
    fill: { color: theme.accent }
  });

  // 左侧日期
  slide.addText("2026年5月", {
    x: 0.5,
    y: 3.7,
    w: 3.3,
    h: 0.5,
    fontSize: 14,
    fontFace: "Microsoft YaHei",
    color: theme.muted,
    align: "left"
  });

  // 右侧标题 - 白色
  slide.addText("智慧农业", {
    x: 4.5,
    y: 2.0,
    w: 4.5,
    h: 0.8,
    fontSize: 36,
    fontFace: "Microsoft YaHei",
    color: "FFFFFF",
    bold: true,
    align: "left"
  });

  slide.addText("数字化管理平台", {
    x: 4.5,
    y: 2.8,
    w: 4.5,
    h: 0.6,
    fontSize: 20,
    fontFace: "Microsoft YaHei",
    color: theme.light,
    align: "left"
  });

  // 右下角装饰块
  slide.addShape("rect", {
    x: 9.2,
    y: 5.0,
    w: 0.5,
    h: 0.5,
    fill: { color: theme.accent }
  });

  return slide;
}

module.exports = { createSlide, theme };
