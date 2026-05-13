/**
 * slide-05.cjs - 功能模块总览
 * 3x4网格展示12个核心模块
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

  // 白色背景
  slide.background = { color: theme.bg };

  // 顶部深绿色标题栏
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: slideWidth,
    h: 0.9,
    fill: { color: theme.primary }
  });

  // 标题
  slide.addText("功能模块总览", {
    x: 0.5,
    y: 0.2,
    w: 4,
    h: 0.5,
    fontSize: 26,
    fontFace: "Microsoft YaHei",
    color: "FFFFFF",
    bold: true,
    align: "left"
  });

  // 12个模块数据
  const modules = [
    { name: "园区导览", color: theme.primary },
    { name: "计划管理", color: theme.secondary },
    { name: "作物管理", color: theme.accent },
    { name: "农事管理", color: theme.primary },
    { name: "人工管理", color: theme.secondary },
    { name: "库存管理", color: theme.accent },
    { name: "审批中心", color: theme.primary },
    { name: "生产汇总", color: theme.secondary },
    { name: "智能调度", color: theme.accent },
    { name: "IoT环境", color: theme.primary },
    { name: "系统设置", color: theme.secondary },
    { name: "数据同步", color: theme.accent }
  ];

  // 3x4 网格布局
  const startX = 0.5;
  const startY = 1.15;
  const cardWidth = 2.2;
  const cardHeight = 1.0;
  const gapX = 0.2;
  const gapY = 0.15;

  modules.forEach((mod, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = startX + col * (cardWidth + gapX);
    const y = startY + row * (cardHeight + gapY);

    // 卡片背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: cardWidth,
      h: cardHeight,
      fill: { color: "FFFFFF" },
      line: { color: theme.light, width: 1 },
      rectRadius: 0.08
    });

    // 左侧彩色装饰条
    slide.addShape("rect", {
      x: x,
      y: y + 0.15,
      w: 0.06,
      h: cardHeight - 0.3,
      fill: { color: mod.color }
    });

    // 模块名称
    slide.addText(mod.name, {
      x: x,
      y: y,
      w: cardWidth,
      h: cardHeight,
      fontSize: 14,
      fontFace: "Microsoft YaHei",
      color: mod.color,
      bold: true,
      align: "center",
      valign: "middle"
    });

    // 右上角小装饰方块
    slide.addShape("rect", {
      x: x + cardWidth - 0.35,
      y: y + 0.12,
      w: 0.18,
      h: 0.18,
      fill: { color: mod.color, transparency: 30 }
    });
  });

  // 底部装饰
  slide.addShape("rect", {
    x: 0.5,
    y: 4.0,
    w: 0.3,
    h: 0.3,
    fill: { color: theme.light }
  });

  // 页码
  slide.addShape("ellipse", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.primary }
  });

  slide.addText("5", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fontSize: 12,
    fontFace: "Arial",
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle"
  });

  return slide;
}

module.exports = { createSlide, theme };
