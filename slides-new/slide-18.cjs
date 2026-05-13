/**
 * slide-18.cjs - 页面清单
 * 按模块分类展示80+页面，8个模块分组
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
  slide.addText("页面清单", {
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

  // 总页面数
  slide.addText("80+", {
    x: 8.0,
    y: 0.2,
    w: 1.0,
    h: 0.5,
    fontSize: 24,
    fontFace: "Arial",
    color: theme.light,
    bold: true,
    align: "right"
  });

  slide.addText("页面", {
    x: 8.8,
    y: 0.3,
    w: 0.7,
    h: 0.3,
    fontSize: 12,
    fontFace: "Microsoft YaHei",
    color: theme.light,
    align: "left"
  });

  // 模块页面数据
  const modules = [
    { name: "首页仪表盘", pages: 4, color: theme.primary },
    { name: "园区导览", pages: 6, color: theme.secondary },
    { name: "计划管理", pages: 8, color: theme.accent },
    { name: "作物管理", pages: 10, color: theme.primary },
    { name: "农事管理", pages: 12, color: theme.secondary },
    { name: "人工管理", pages: 14, color: theme.accent },
    { name: "库存物料", pages: 14, color: theme.primary },
    { name: "审批中心", pages: 12, color: theme.secondary }
  ];

  // 两列布局
  const col1X = 0.5;
  const col2X = 5.1;
  const startY = 1.1;
  const rowH = 0.5;
  const gapY = 0.08;

  modules.forEach((mod, index) => {
    const col = index < 4 ? 0 : 1;
    const row = index % 4;
    const x = col === 0 ? col1X : col2X;
    const y = startY + row * (rowH + gapY);

    // 背景条
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: 4.4,
      h: rowH,
      fill: { color: mod.color, transparency: 90 },
      rectRadius: 0.04
    });

    // 左侧色块
    slide.addShape("rect", {
      x: x,
      y: y,
      w: 0.06,
      h: rowH,
      fill: { color: mod.color }
    });

    // 模块名称
    slide.addText(mod.name, {
      x: x + 0.15,
      y: y,
      w: 2.5,
      h: rowH,
      fontSize: 13,
      fontFace: "Microsoft YaHei",
      color: mod.color,
      bold: true,
      align: "left",
      valign: "middle"
    });

    // 页面数量
    slide.addText(mod.pages + "页", {
      x: x + 3.2,
      y: y,
      w: 1.0,
      h: rowH,
      fontSize: 13,
      fontFace: "Arial",
      color: mod.color,
      bold: true,
      align: "right",
      valign: "middle"
    });
  });

  // 其他模块（合并显示）
  const otherModules = [
    { name: "IoT环境监控", pages: 6 },
    { name: "智能调度", pages: 4 },
    { name: "生产汇总", pages: 8 },
    { name: "系统设置", pages: 6 },
    { name: "数据同步", pages: 2 }
  ];

  slide.addText("其他模块", {
    x: 0.5,
    y: 3.55,
    w: 2,
    h: 0.35,
    fontSize: 12,
    fontFace: "Microsoft YaHei",
    color: theme.muted,
    bold: true,
    align: "left"
  });

  const otherStartX = 0.5;
  const otherStartY = 3.95;
  const otherColW = 1.8;
  const otherRowH = 0.4;
  const otherGapX = 0.1;
  const otherGapY = 0.05;

  otherModules.forEach((mod, index) => {
    const col = index % 5;
    const x = otherStartX + col * (otherColW + otherGapX);
    const y = otherStartY;

    // 标签背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: otherColW,
      h: otherRowH,
      fill: { color: theme.muted, transparency: 85 },
      rectRadius: 0.04
    });

    // 模块名
    slide.addText(mod.name, {
      x: x,
      y: y,
      w: otherColW - 0.5,
      h: otherRowH,
      fontSize: 10,
      fontFace: "Microsoft YaHei",
      color: theme.muted,
      align: "left",
      valign: "middle"
    });

    // 数量
    slide.addText(mod.pages + "页", {
      x: x + otherColW - 0.6,
      y: y,
      w: 0.5,
      h: otherRowH,
      fontSize: 10,
      fontFace: "Arial",
      color: theme.muted,
      align: "right",
      valign: "middle"
    });
  });

  // 底部汇总
  slide.addShape("rect", {
    x: 0.5,
    y: 4.65,
    w: 9.0,
    h: 0.4,
    fill: { color: theme.primary, transparency: 92 }
  });

  slide.addText("模块化设计，路由懒加载，按需渲染，首屏加载性能优化", {
    x: 0.7,
    y: 4.65,
    w: 8.6,
    h: 0.4,
    fontSize: 12,
    fontFace: "Microsoft YaHei",
    color: theme.primary,
    align: "center",
    valign: "middle"
  });

  // 页码
  slide.addShape("ellipse", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.primary }
  });

  slide.addText("18", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fontSize: 11,
    fontFace: "Arial",
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle"
  });

  return slide;
}

module.exports = { createSlide, theme };
