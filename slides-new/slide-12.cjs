/**
 * slide-12.cjs - 审批中心
 * 大标题强调"37种审批类型"，七大审批类型分类展示
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
  slide.addText("审批中心", {
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

  // 大数字强调
  slide.addText("37", {
    x: 7.0,
    y: 0.15,
    w: 1.5,
    h: 0.6,
    fontSize: 36,
    fontFace: "Arial",
    color: theme.light,
    bold: true,
    align: "right"
  });

  slide.addText("种审批类型", {
    x: 8.0,
    y: 0.3,
    w: 1.5,
    h: 0.4,
    fontSize: 12,
    fontFace: "Microsoft YaHei",
    color: theme.light,
    align: "left"
  });

  // 七大审批类型
  const approvalTypes = [
    {
      title: "生产审批",
      count: 8,
      items: "生产计划/种植方案/采收计划",
      color: theme.primary
    },
    {
      title: "物料审批",
      count: 6,
      items: "采购申请/领料申请/调拨申请",
      color: theme.secondary
    },
    {
      title: "人工审批",
      count: 5,
      items: "请假申请/加班申请/调岗申请",
      color: theme.accent
    },
    {
      title: "行政审批",
      count: 6,
      items: "用章申请/车辆申请/场地申请",
      color: theme.primary
    },
    {
      title: "财务审批",
      count: 4,
      items: "报销申请/付款申请/预支申请",
      color: theme.secondary
    },
    {
      title: "质量审批",
      count: 4,
      items: "检测申请/验收申请/整改申请",
      color: theme.accent
    },
    {
      title: "其他审批",
      count: 4,
      items: "设备申请/维保申请/其他申请",
      color: theme.primary
    }
  ];

  // 左侧两列布局
  const startX = 0.5;
  const startY = 1.1;
  const colW = 4.5;
  const rowH = 0.6;
  const gapX = 0.15;
  const gapY = 0.08;

  approvalTypes.forEach((type, index) => {
    const col = index < 4 ? 0 : 1;
    const row = index < 4 ? index : index - 4;
    const x = startX + col * (colW + gapX);
    const y = startY + row * (rowH + gapY);

    // 行背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: colW,
      h: rowH,
      fill: { color: type.color, transparency: 92 },
      rectRadius: 0.05
    });

    // 左侧色块
    slide.addShape("rect", {
      x: x,
      y: y,
      w: 0.08,
      h: rowH,
      fill: { color: type.color }
    });

    // 标题和数量
    slide.addText(type.title, {
      x: x + 0.15,
      y: y + 0.08,
      w: 1.5,
      h: 0.28,
      fontSize: 13,
      fontFace: "Microsoft YaHei",
      color: type.color,
      bold: true,
      align: "left"
    });

    slide.addText(String(type.count) + "种", {
      x: x + 1.5,
      y: y + 0.08,
      w: 0.6,
      h: 0.28,
      fontSize: 12,
      fontFace: "Arial",
      color: theme.muted,
      align: "left"
    });

    // 具体审批内容
    slide.addText(type.items, {
      x: x + 0.15,
      y: y + 0.32,
      w: colW - 0.3,
      h: 0.24,
      fontSize: 10,
      fontFace: "Microsoft YaHei",
      color: theme.muted,
      align: "left"
    });
  });

  // 底部汇总
  slide.addShape("rect", {
    x: 0.5,
    y: 4.55,
    w: 9.0,
    h: 0.45,
    fill: { color: theme.primary, transparency: 90 }
  });

  slide.addText("支持移动端审批、批量审批、审批历史追溯、催办提醒", {
    x: 0.7,
    y: 4.55,
    w: 8.6,
    h: 0.45,
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

  slide.addText("12", {
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
