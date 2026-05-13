/**
 * slide-09.cjs - 农事管理
 * 4个功能区卡片
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
  slide.addText("农事管理", {
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

  // 4个功能区数据
  const modules = [
    {
      title: "任务中心",
      items: ["农事任务创建与分配", "任务执行跟踪", "任务完成确认", "批量任务管理"],
      color: theme.primary
    },
    {
      title: "巡查记录",
      items: ["巡查计划制定", "巡查路线记录", "异常情况上报", "巡查历史查询"],
      color: theme.secondary
    },
    {
      title: "问题分派",
      items: ["问题登记", "责任分派", "处理跟踪", "结果验收"],
      color: theme.accent
    },
    {
      title: "临时任务",
      items: ["临时任务创建", "紧急任务标记", "快速分派", "执行反馈"],
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

  modules.forEach((mod, index) => {
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

    // 顶部装饰条
    slide.addShape("rect", {
      x: x,
      y: y,
      w: cardWidth,
      h: 0.08,
      fill: { color: mod.color }
    });

    // 标题
    slide.addText(mod.title, {
      x: x + 0.2,
      y: y + 0.2,
      w: cardWidth - 0.4,
      h: 0.4,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: mod.color,
      bold: true,
      align: "left"
    });

    // 功能点 - 两列布局
    const midX = cardWidth / 2;
    mod.items.forEach((item, pIndex) => {
      const colIdx = pIndex % 2;
      const rowIdx = Math.floor(pIndex / 2);
      const itemX = x + 0.2 + colIdx * midX;
      const itemY = y + 0.65 + rowIdx * 0.5;

      // 小方块
      slide.addShape("rect", {
        x: itemX,
        y: itemY + 0.08,
        w: 0.15,
        h: 0.15,
        fill: { color: mod.color, transparency: 30 }
      });

      // 文字
      slide.addText(item, {
        x: itemX + 0.22,
        y: itemY,
        w: midX - 0.4,
        h: 0.35,
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

  slide.addText("9", {
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
