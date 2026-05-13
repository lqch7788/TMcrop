/**
 * slide-11.cjs - 库存管理
 * 4个功能卡片
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
  slide.addText("库存管理", {
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
      title: "物料管理",
      items: ["物料基础信息", "物料分类管理", "安全库存预警", "物料查询统计"],
      color: theme.primary
    },
    {
      title: "入库管理",
      items: ["采购入库", "退货入库", "调拨入库", "入库单据打印"],
      color: theme.secondary
    },
    {
      title: "出库管理",
      items: ["生产领料", "销售出库", "调拨出库", "出库单据跟踪"],
      color: theme.accent
    },
    {
      title: "供应商管理",
      items: ["供应商档案", "供应商评价", "供货记录", "账期管理"],
      color: theme.primary
    }
  ];

  // 2x2网格布局
  const startX = 0.5;
  const startY = 1.15;
  const cardWidth = 4.4;
  const cardHeight = 1.9;
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

    // 左侧大装饰块
    slide.addShape("rect", {
      x: x + 0.15,
      y: y + 0.3,
      w: 0.5,
      h: 0.5,
      fill: { color: card.color, transparency: 20 }
    });

    // 标题
    slide.addText(card.title, {
      x: x + 0.8,
      y: y + 0.3,
      w: cardWidth - 1.0,
      h: 0.4,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: card.color,
      bold: true,
      align: "left"
    });

    // 分隔线
    slide.addShape("rect", {
      x: x + 0.15,
      y: y + 0.8,
      w: cardWidth - 0.3,
      h: 0.02,
      fill: { color: theme.light }
    });

    // 功能点列表
    card.items.forEach((item, pIndex) => {
      slide.addText("- " + item, {
        x: x + 0.3,
        y: y + 0.9 + pIndex * 0.28,
        w: cardWidth - 0.5,
        h: 0.28,
        fontSize: 11,
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

  slide.addText("11", {
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
