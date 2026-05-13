/**
 * slide-07.cjs - 计划管理
 * 2x2网格卡片布局
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
  slide.addText("计划管理", {
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

  // 4个功能卡片数据
  const cards = [
    {
      title: "生产计划",
      items: ["年度生产规划", "月度执行计划", "计划进度跟踪", "计划调整记录"]
    },
    {
      title: "订单管理",
      items: ["订单录入", "订单查询", "订单状态跟踪", "订单完成统计"]
    },
    {
      title: "技术方案",
      items: ["种植方案制定", "技术规范标准", "操作流程定义", "方案执行记录"]
    },
    {
      title: "采购计划",
      items: ["物料需求计划", "采购申请", "采购审批流程", "采购到货跟踪"]
    }
  ];

  // 2x2网格布局
  const startX = 0.5;
  const startY = 1.15;
  const cardWidth = 4.4;
  const cardHeight = 2.0;
  const gapX = 0.2;
  const gapY = 0.2;

  cards.forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
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
      w: 0.08,
      h: cardHeight - 0.3,
      fill: { color: index % 2 === 0 ? theme.primary : theme.secondary }
    });

    // 标题
    slide.addText(card.title, {
      x: x + 0.2,
      y: y + 0.15,
      w: cardWidth - 0.4,
      h: 0.4,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: index % 2 === 0 ? theme.primary : theme.secondary,
      bold: true,
      align: "left",
      valign: "middle"
    });

    // 分隔线
    slide.addShape("rect", {
      x: x + 0.2,
      y: y + 0.55,
      w: cardWidth - 0.4,
      h: 0.02,
      fill: { color: theme.light }
    });

    // 功能点列表
    card.items.forEach((item, pIndex) => {
      slide.addText("- " + item, {
        x: x + 0.3,
        y: y + 0.65 + pIndex * 0.32,
        w: cardWidth - 0.5,
        h: 0.3,
        fontSize: 12,
        fontFace: "Microsoft YaHei",
        color: theme.text,
        align: "left",
        valign: "middle"
      });
    });
  });

  // 页码
  slide.addShape("ellipse", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.primary }
  });

  slide.addText("7", {
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
