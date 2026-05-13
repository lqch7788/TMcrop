/**
 * slide-08.cjs - 作物管理
 * 横向流程图展示生命周期
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
  slide.addText("作物管理", {
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

  // 生命周期阶段数据
  const stages = [
    { name: "种源", desc: "品种选择\n种子管理" },
    { name: "育苗", desc: "播种催芽\n苗期管理" },
    { name: "种植", desc: "田间种植\n生长记录" },
    { name: "采收", desc: "成熟采收\n品质检测" },
    { name: "库存", desc: "仓储管理\n出库追踪" }
  ];

  // 横向流程图布局
  const startX = 0.6;
  const startY = 2.2;
  const stageW = 1.6;
  const stageH = 1.8;
  const gapX = 0.35;

  stages.forEach((stage, index) => {
    const x = startX + index * (stageW + gapX);

    // 阶段圆形背景
    slide.addShape("ellipse", {
      x: x + (stageW - 1.0) / 2,
      y: startY,
      w: 1.0,
      h: 1.0,
      fill: { color: index % 2 === 0 ? theme.primary : theme.secondary }
    });

    // 阶段编号
    slide.addText(String(index + 1), {
      x: x + (stageW - 1.0) / 2,
      y: startY,
      w: 1.0,
      h: 1.0,
      fontSize: 28,
      fontFace: "Arial",
      color: "FFFFFF",
      bold: true,
      align: "center",
      valign: "middle"
    });

    // 阶段名称
    slide.addText(stage.name, {
      x: x,
      y: startY + 1.1,
      w: stageW,
      h: 0.35,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: theme.primary,
      bold: true,
      align: "center"
    });

    // 阶段描述
    slide.addText(stage.desc, {
      x: x,
      y: startY + 1.45,
      w: stageW,
      h: 0.6,
      fontSize: 11,
      fontFace: "Microsoft YaHei",
      color: theme.muted,
      align: "center"
    });

    // 箭头连接线（除了最后一个）
    if (index < stages.length - 1) {
      // 箭头线
      slide.addShape("rect", {
        x: x + stageW - 0.05,
        y: startY + 0.45,
        w: gapX + 0.1,
        h: 0.06,
        fill: { color: theme.accent }
      });

      // 箭头三角形
      slide.addText(">", {
        x: x + stageW + gapX - 0.15,
        y: startY + 0.28,
        w: 0.3,
        h: 0.4,
        fontSize: 20,
        fontFace: "Arial",
        color: theme.accent,
        bold: true,
        align: "center",
        valign: "middle"
      });
    }
  });

  // 底部说明
  slide.addShape("roundRect", {
    x: 0.5,
    y: 4.3,
    w: 9.0,
    h: 0.6,
    fill: { color: theme.light, transparency: 50 },
    rectRadius: 0.06
  });

  slide.addText("覆盖从种子入库到成品出库的全生命周期管理，支持批次追溯和质量控制", {
    x: 0.7,
    y: 4.35,
    w: 8.6,
    h: 0.5,
    fontSize: 13,
    fontFace: "Microsoft YaHei",
    color: theme.text,
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

  slide.addText("8", {
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
