/**
 * slide-14.cjs - 生产计划流程
 * 纵向流程图：订单 -> 计划 -> 执行 -> 采收 -> 库存
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
  slide.addText("生产计划流程", {
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

  // 纵向流程阶段
  const stages = [
    { label: "订单", desc: "客户需求录入\n订单确认", color: theme.primary },
    { label: "计划", desc: "生产计划制定\n资源配置", color: theme.secondary },
    { label: "执行", desc: "农事任务执行\n过程监控", color: theme.accent },
    { label: "采收", desc: "成熟采收\n质量检测", color: theme.secondary },
    { label: "库存", desc: "入库管理\n销售出库", color: theme.primary }
  ];

  // 纵向流程图布局
  const startX = 1.5;
  const startY = 1.3;
  const stageW = 1.4;
  const stageH = 1.0;
  const gapY = 0.55;

  stages.forEach((stage, index) => {
    const y = startY + index * (stageH + gapY);

    // 阶段圆形
    slide.addShape("ellipse", {
      x: startX,
      y: y,
      w: stageW,
      h: stageH,
      fill: { color: stage.color }
    });

    // 阶段编号
    slide.addText(String(index + 1), {
      x: startX,
      y: y + 0.1,
      w: stageW,
      h: 0.35,
      fontSize: 20,
      fontFace: "Arial",
      color: "FFFFFF",
      bold: true,
      align: "center"
    });

    // 阶段名称
    slide.addText(stage.label, {
      x: startX,
      y: y + 0.45,
      w: stageW,
      h: 0.35,
      fontSize: 14,
      fontFace: "Microsoft YaHei",
      color: "FFFFFF",
      bold: true,
      align: "center"
    });

    // 描述文字（右侧）
    slide.addText(stage.desc, {
      x: startX + stageW + 0.3,
      y: y + 0.15,
      w: 2.5,
      h: 0.7,
      fontSize: 12,
      fontFace: "Microsoft YaHei",
      color: theme.text,
      align: "left",
      valign: "middle"
    });

    // 垂直连接线（除了最后一个）
    if (index < stages.length - 1) {
      slide.addShape("rect", {
        x: startX + stageW / 2 - 0.02,
        y: y + stageH,
        w: 0.04,
        h: gapY - 0.1,
        fill: { color: theme.light }
      });

      // 向下箭头
      slide.addText("v", {
        x: startX + stageW / 2 - 0.15,
        y: y + stageH + gapY - 0.45,
        w: 0.3,
        h: 0.3,
        fontSize: 16,
        fontFace: "Arial",
        color: theme.accent,
        bold: true,
        align: "center"
      });
    }
  });

  // 右侧装饰块
  slide.addShape("roundRect", {
    x: 7.5,
    y: 1.5,
    w: 2.0,
    h: 3.2,
    fill: { color: theme.light, transparency: 60 },
    rectRadius: 0.1
  });

  slide.addText("生产管理\n全流程覆盖", {
    x: 7.5,
    y: 2.5,
    w: 2.0,
    h: 1.0,
    fontSize: 14,
    fontFace: "Microsoft YaHei",
    color: theme.primary,
    bold: true,
    align: "center"
  });

  // 页码
  slide.addShape("ellipse", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.primary }
  });

  slide.addText("14", {
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
