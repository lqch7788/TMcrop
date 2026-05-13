/**
 * slide-20.cjs - 总结页
 * 深绿色背景，感谢观看
 */

// 主题配色
const theme = {
  primary: "1B4332",
  secondary: "2D6A4F",
  accent: "40916C",
  light: "95D5B2",
  bg: "FFFFFF",
  text: "1B1B1B",
  muted: "6C757D"
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();

  const slideWidth = 10;
  const slideHeight = 5.625;

  // 深绿色背景
  slide.background = { color: theme.primary };

  // 装饰元素 - 左侧薄荷绿矩形
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 2.5,
    h: slideHeight,
    fill: { color: theme.secondary, transparency: 40 }
  });

  // 装饰元素 - 右侧装饰块
  slide.addShape("rect", {
    x: 8.0,
    y: 0,
    w: 2.0,
    h: 3.0,
    fill: { color: theme.accent, transparency: 30 }
  });

  // 装饰元素 - 右下角装饰
  slide.addShape("ellipse", {
    x: 8.5,
    y: 4.0,
    w: 1.5,
    h: 1.5,
    fill: { color: theme.light, transparency: 50 }
  });

  // 主标题
  slide.addText("感谢观看", {
    x: 0.5,
    y: 1.8,
    w: 9.0,
    h: 1.0,
    fontSize: 48,
    fontFace: "Microsoft YaHei",
    color: "FFFFFF",
    bold: true,
    align: "center"
  });

  // 副标题
  slide.addText("THANK YOU", {
    x: 0.5,
    y: 2.8,
    w: 9.0,
    h: 0.6,
    fontSize: 24,
    fontFace: "Arial",
    color: theme.light,
    align: "center"
  });

  // 分隔线
  slide.addShape("rect", {
    x: 3.5,
    y: 3.5,
    w: 3.0,
    h: 0.04,
    fill: { color: theme.light }
  });

  // 联系信息
  slide.addText("农业种植管理系统 V1.1", {
    x: 0.5,
    y: 3.8,
    w: 9.0,
    h: 0.4,
    fontSize: 16,
    fontFace: "Microsoft YaHei",
    color: theme.light,
    align: "center"
  });

  slide.addText("2026年5月", {
    x: 0.5,
    y: 4.25,
    w: 9.0,
    h: 0.35,
    fontSize: 14,
    fontFace: "Microsoft YaHei",
    color: theme.light,
    align: "center"
  });

  // 左下角装饰
  slide.addShape("rect", {
    x: 0.5,
    y: 5.0,
    w: 0.5,
    h: 0.5,
    fill: { color: theme.accent }
  });

  slide.addShape("rect", {
    x: 0.7,
    y: 5.15,
    w: 0.3,
    h: 0.3,
    fill: { color: theme.light }
  });

  return slide;
}

module.exports = { createSlide, theme };
